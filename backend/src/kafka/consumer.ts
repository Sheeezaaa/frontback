import { Consumer, EachMessagePayload } from 'kafkajs';
import { kafka } from './kafkaClient';
import { KAFKA_TOPICS, OrderCreatedPayload } from './topics';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { logger } from '../config/logger';

let consumer: Consumer | null = null;
let isRunning = false;

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

    await consumer.run({
      autoCommit: true,
      eachMessage: async (payload: EachMessagePayload) => {
        await handleOrderEvent(payload);
      },
    });

    logger.info(`Kafka Consumer listening on topic: ${KAFKA_TOPICS.ORDERS}`);
  } catch (error) {
    logger.error('Failed to start Kafka Consumer', error);
  }
}

/**
 * Handle incoming OrderCreated event with strict idempotency and inventory finalization
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
  } catch (err) {
    logger.error('Failed to parse Kafka message JSON payload', { error: err, rawValue });
    return;
  }

  const { eventId, tenantId, orderId, orderNumber, items } = event;

  logger.info(`[Kafka Event Received] Topic: ${topic} | Partition: ${partition} | Offset: ${offset} | Tenant: ${tenantId} | Order: ${orderId} (${orderNumber})`);

  try {
    // 1. IDEMPOTENCY CHECK
    // Check if event was already processed by eventId or by (topic, partition, offset)
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

    // 2. TRANSACTIONAL INVENTORY FINALIZATION & ORDER STATUS UPDATE
    await prisma.$transaction(async (tx) => {
      // Deduct inventory quantities and release reserved quantity
      for (const item of items) {
        const inv = await tx.inventory.findUnique({
          where: { product_id: item.productId },
        });

        if (inv) {
          await tx.inventory.update({
            where: { product_id: item.productId },
            data: {
              quantity: { decrement: item.quantity },
              reserved_quantity: { decrement: item.quantity },
            },
          });
        }
      }

      // Update Order status to PROCESSING
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'PROCESSING',
        },
      });

      // 3. RECORD PROCESSED EVENT IN IDEMPOTENCY LEDGER
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

    logger.info(`[Event Processed Successfully] Order ${orderNumber} finalized and marked PROCESSING.`);

    // 4. TRIGGER SERVERLESS INVOICE GENERATION ASYNCHRONOUSLY
    triggerServerlessInvoice(tenantId, orderId, orderNumber, event.totalAmount).catch((err) => {
      logger.warn(`Non-blocking serverless invoice notification failed: ${err.message}`);
    });
  } catch (error: any) {
    logger.error(`Error processing Kafka event for order ${orderId}:`, {
      error: error.message,
      stack: error.stack,
    });
    // In production, unrecoverable failures would route to a Dead Letter Queue (DLQ)
  }
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

  const start = Date.now();
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

    const duration = Date.now() - start;
    if (res.ok) {
      const data: any = await res.json();
      logger.info(`Serverless invoice generated in ${duration}ms`, {
        orderId,
        coldStart: data.coldStart ?? false,
      });
    } else {
      logger.warn(`Serverless invoice returned status ${res.status} after ${duration}ms`);
    }
  } catch (err: any) {
    // If local serverless isn't running yet, record info
    logger.debug(`Serverless invoice dispatch skipped/unreachable: ${err.message}`);
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
