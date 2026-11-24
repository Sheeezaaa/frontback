import { prisma } from '../config/database';
import { publishEvent } from './producer';
import { KAFKA_TOPICS } from './topics';
import { logger } from '../config/logger';

let relayTimer: NodeJS.Timeout | null = null;
let isRelaying = false;

/**
 * Process pending outbox events and publish to Kafka
 */
export async function processOutboxQueue(): Promise<number> {
  if (isRelaying) return 0;
  isRelaying = true;

  let publishedCount = 0;

  try {
    const pendingEvents = await prisma.outboxEvent.findMany({
      where: {
        status: 'PENDING',
        retry_count: { lt: 10 },
      },
      orderBy: { created_at: 'asc' },
      take: 25,
    });

    for (const event of pendingEvents) {
      try {
        // Use tenant_id as partition key to ensure tenant-specific ordering
        await publishEvent(
          KAFKA_TOPICS.ORDERS,
          event.tenant_id,
          event.payload,
          {
            'event-id': event.id,
            'event-type': event.event_type,
            'tenant-id': event.tenant_id,
          }
        );

        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'PUBLISHED',
            published_at: new Date(),
            error_message: null,
          },
        });

        publishedCount++;
        logger.info(`Outbox event published to Kafka [${event.event_type}]`, {
          eventId: event.id,
          tenantId: event.tenant_id,
          aggregateId: event.aggregate_id,
        });
      } catch (err: any) {
        logger.error(`Failed to publish outbox event ${event.id}`, { error: err.message });
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            retry_count: { increment: 1 },
            error_message: err.message,
            status: event.retry_count >= 9 ? 'FAILED' : 'PENDING',
          },
        });
      }
    }
  } catch (error) {
    logger.error('Error in outbox relay execution', error);
  } finally {
    isRelaying = false;
  }

  return publishedCount;
}

/**
 * Start the background Outbox Polling Relay
 */
export function startOutboxRelay(intervalMs = 3000): void {
  if (relayTimer) return;

  logger.info(`Starting Transactional Outbox Relay (polling every ${intervalMs}ms)`);
  relayTimer = setInterval(async () => {
    await processOutboxQueue();
  }, intervalMs);
}

/**
 * Stop Outbox Relay on shutdown
 */
export function stopOutboxRelay(): void {
  if (relayTimer) {
    clearInterval(relayTimer);
    relayTimer = null;
    logger.info('Outbox Relay stopped');
  }
}
