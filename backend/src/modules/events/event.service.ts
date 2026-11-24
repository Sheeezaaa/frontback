import { prisma } from '../../config/database';

export class EventService {
  /**
   * List processed events and outbox statuses for the tenant
   */
  async getEventMonitoringData(tenantId: string) {
    const [processedEvents, outboxEvents, outboxStats] = await Promise.all([
      prisma.processedEvent.findMany({
        where: { tenant_id: tenantId },
        orderBy: { processed_at: 'desc' },
        take: 50,
      }),
      prisma.outboxEvent.findMany({
        where: { tenant_id: tenantId },
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
      prisma.outboxEvent.groupBy({
        by: ['status'],
        where: { tenant_id: tenantId },
        _count: { id: true },
      }),
    ]);

    return {
      processedEvents: processedEvents.map((e) => ({
        id: e.id,
        eventId: e.event_id,
        topic: e.topic,
        partition: e.partition,
        offset: e.offset.toString(),
        orderId: e.order_id,
        status: e.status,
        payload: e.payload,
        processedAt: e.processed_at,
      })),
      outboxEvents: outboxEvents.map((o) => ({
        id: o.id,
        eventType: o.event_type,
        aggregateType: o.aggregate_type,
        aggregateId: o.aggregate_id,
        status: o.status,
        retryCount: o.retry_count,
        errorMessage: o.error_message,
        createdAt: o.created_at,
        publishedAt: o.published_at,
      })),
      outboxStats: outboxStats.reduce((acc, curr) => {
        acc[curr.status] = curr._count.id;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

export const eventService = new EventService();
