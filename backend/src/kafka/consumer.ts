import { Consumer, EachMessagePayload } from 'kafkajs';
import { kafka } from './kafkaClient';
import { publishEvent } from './producer';
import { KAFKA_TOPICS, OrderCreatedPayload } from './topics';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { logger } from '../config/logger';

let consumer: Consumer | null = null;
let isRunning = false;
const MAX_RETRIES = 3;

export async function startConsumer(): Promise<void> {
  if (isRunning) return;

  try {
    consumer = kafka.consumer({
      groupId: env.KAFKA_GROUP_ID,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });

    await consumer.connect();
    logger.info(`Kafka Consumer connected to group: ${env.KAFKA_GROUP_ID}`);

    await consumer.subscribe({
      topic: KAFKA_TOPICS.ORDERS,
      fromBeginning: false,
    });

    isRunning = true;

    // Use autoCommit: false for strict manual offset commits
    await consumer.run({
      autoCommit: false,
      eachMessage: async (payload: EachMessagePayload) => {
        await processMessageWithRetryAndDLQ(payload);
      },
    });

    logger.info(`Kafka Consumer active on topic: ${KAFKA_TOPICS.ORDERS} (manual offset commit enabled)`);
  } catch (error) {
    logger.error('Failed to start Kafka Consumer', error);
  }
}

/**
 * Message processing with Retry, Dead Letter Queue (DLQ), and Manual Offset Commit
 */
async function processMessageWithRetryAndDLQ(payload: EachMessagePayload): Promise<void> {
  const { topic, partition, message } = payload;
  const offset = BigInt(message.offset);
  const nextOffset = (offset + 1n).toString();

  let attempt = 0;
  let success = false;

  while (attempt < MAX_RETRIES && !success) {
    try {
      attempt++;
      await handleOrderEvent(payload);
      success = true;

      // Manual commit on successful processing
      if (consumer) {
        await consumer.commitOffsets([
          { topic, partition, offset: nextOffset },
        ]);
        logger.debug(`[Manual Commit] Committed offset ${nextOffset} for topic ${topic} (p:${partition})`);
      }
    } catch (err: any) {
      logger.warn(`[Kafka Processing Attempt ${attempt}/${MAX_RETRIES} Failed] Offset: ${offset} | Error: ${err.message}`);

      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 300ms, 600ms, 1200ms
        const delayMs = Math.pow(2, attempt) * 300;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        // Route to Dead Letter Queue (DLQ)
        logger.error(`[DLQ Route] Message at offset ${offset} exceeded max retries (${MAX_RETRIES}). Routing to ${KAFKA_TOPICS.ORDERS_DLQ}`);
        await routeToDeadLetterQueue(payload, err);

        // Commit offset after routing to DLQ so poison pill does not halt consumer partition
        if (consumer) {
          await consumer.commitOffsets([
            { topic, partition, offset: nextOffset },
          ]);
          logger.info(`[Manual Commit Post-DLQ] Offset ${nextOffset} committed after DLQ dispatch`);
        }
      }
    }
  }
}

/**
 * Route poison-pill or permanently unprocessable event to Dead Letter Queue
 */
async function routeToDeadLetterQueue(
  { topic, partition, message }: EachMessagePayload,
  error: any
): Promise<void> {
  const offset = BigInt(message.offset);
  const rawValue = message.value?.toString() || '{}';

  let tenantId = 'unknown';
  let eventId = `dlq-${Date.now()}`;
  let orderId: string | undefined;

  try {
    const parsed = JSON.parse(rawValue);
    tenantId = parsed.tenantId || 'unknown';
    eventId = parsed.eventId || eventId;
    orderId = parsed.orderId;
  } catch {
    // If not JSON, use defaults
  }

  const dlqPayload = {
    dlqEventId: `dlq-${Date.now()}`,
    originalTopic: topic,
    originalPartition: partition,
    originalOffset: offset.toString(),
    failureReason: error.message || 'Unknown processing error',
    failureStack: error.stack,
    failedAt: new Date().toISOString(),
    rawMessage: rawValue,
  };

  try {
    // Publish to DLQ topic
    await publishEvent(KAFKA_TOPICS.ORDERS_DLQ, tenantId, dlqPayload, {
      'dlq-origin-topic': topic,
      'dlq-origin-partition': partition.toString(),
      'dlq-origin-offset': offset.toString(),
      'dlq-error': error.message || 'Error',
    });

    // Record in ProcessedEvents as DLQ_ROUTED if valid tenant exists
    if (tenantId !== 'unknown') {
      await prisma.processedEvent.create({
        data: {
          tenant_id: tenantId,
          event_id: `dlq-${eventId}`,
          topic: KAFKA_TOPICS.ORDERS_DLQ,
          partition,
          offset,
          order_id: orderId,
          status: 'DLQ_ROUTED',
          payload: dlqPayload as any,
        },
      }).catch(() => {});
    }

    logger.info(`[DLQ Published] Event routed to ${KAFKA_TOPICS.ORDERS_DLQ} successfully for tenant ${tenantId}`);
  } catch (dlqErr: any) {
    logger.error('Critical: Failed to publish message to DLQ topic', dlqErr);
  }
}

/**
 * Handle incoming OrderCreated event with strict tenant_id security & idempotency
 */
export async function handleOrderEvent({
  topic,
  partition,
  message,
}: EachMessagePayload): Promise<void> {
  const offset = BigInt(message.offset);
  const rawValue = message.value?.toString();

  if (!rawValue) {
    logger.warn('Received empty message on Kafka topic', { topic, partition, offset: offset.toString() });
    return;
  }

  let event: OrderCreatedPayload;
  try {
    event = JSON.parse(rawValue);
  } catch (err: any) {
    throw new Error(`Invalid JSON payload format: ${err.message}`);
  }

  const { eventId, tenantId, orderId, orderNumber, items } = event;

  if (!tenantId || !orderId) {
    throw new Error('Malformed event: Missing mandatory tenantId or orderId');
  }

  logger.info(`[Kafka Event Received] Topic: ${topic} | Partition: ${partition} | Offset: ${offset} | Tenant: ${tenantId} | Order: ${orderId} (${orderNumber})`);

  // 1. IDEMPOTENCY CHECK
  const alreadyProcessed = await prisma.processedEvent.findFirst({
    where: {
      OR: [
        { event_id: eventId },
        { topic, partition, offset },
      ],
    },
  });

  if (alreadyProcessed) {
    logger.warn(`[Idempotent Skip] Event ${eventId} (Offset: ${offset}) has already been processed.`);
    return;
  }

  // 2. TRANSACTIONAL TENANT-SCOPED INVENTORY & ORDER UPDATES
  await prisma.$transaction(async (tx) => {
    // A. Verify Order belongs strictly to tenantId
    const orderRecord = await tx.order.findFirst({
      where: {
        id: orderId,
        tenant_id: tenantId, // Strict tenant_id discriminator validation
      },
    });

    if (!orderRecord) {
      throw new Error(`Security Violation: Order ${orderId} does not belong to tenant ${tenantId}`);
    }

    // B. Deduct inventory quantities scoped strictly to tenant_id
    for (const item of items) {
      const inv = await tx.inventory.findFirst({
        where: {
          product_id: item.productId,
          tenant_id: tenantId, // Strict tenant_id discriminator validation
        },
      });

      if (!inv) {
        throw new Error(`Security Violation: Inventory for product ${item.productId} not found under tenant ${tenantId}`);
      }

      await tx.inventory.update({
        where: { id: inv.id },
        data: {
          quantity: { decrement: item.quantity },
          reserved_quantity: { decrement: item.quantity },
        },
      });
    }

    // C. Update Order status to PROCESSING scoped to tenant_id
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'PROCESSING',
      },
    });

    // D. Record processed event in idempotency ledger
    await tx.processedEvent.create({
      data: {
        tenant_id: tenantId,
        event_id: eventId,
        topic,
        partition,
        offset,
        order_id: orderId,
        status: 'PROCESSED',
        payload: event as any,
      },
    });
  });

  logger.info(`[Event Processed Successfully] Order ${orderNumber} finalized and marked PROCESSING for tenant ${tenantId}.`);

  // 3. TRIGGER SERVERLESS INVOICE GENERATION ASYNCHRONOUSLY
  triggerServerlessInvoice(tenantId, orderId, orderNumber, event.totalAmount).catch((err) => {
    logger.warn(`Non-blocking serverless invoice notification deferred: ${err.message}`);
  });
}

/**
 * Dispatch HTTP call to Serverless Function for invoice generation
 */
async function triggerServerlessInvoice(
  tenantId: string,
  orderId: string,
  orderNumber: string,
  totalAmount: number
): Promise<void> {
  const invoiceEndpoint = env.SERVERLESS_INVOICE_URL;
  if (!invoiceEndpoint) return;

  const start = performance.now();
  try {
    const res = await fetch(invoiceEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': tenantId,
      },
      body: JSON.stringify({
        tenantId,
        orderId,
        orderNumber,
        totalAmount,
        generatedAt: new Date().toISOString(),
      }),
    });

    const duration = Number((performance.now() - start).toFixed(2));
    if (res.ok) {
      const data: any = await res.json();
      logger.info(`Serverless invoice generated in ${duration}ms`, {
        orderId,
        coldStart: data.latency?.coldStart ?? false,
      });
    } else {
      logger.warn(`Serverless invoice returned status ${res.status} after ${duration}ms`);
    }
  } catch (err: any) {
    logger.debug(`Serverless invoice dispatch skipped/deferred: ${err.message}`);
  }
}

export async function stopConsumer(): Promise<void> {
  if (consumer && isRunning) {
    try {
      await consumer.disconnect();
      isRunning = false;
      logger.info('Kafka Consumer disconnected gracefully');
    } catch (error) {
      logger.error('Error disconnecting Kafka Consumer', error);
    }
  }
}
