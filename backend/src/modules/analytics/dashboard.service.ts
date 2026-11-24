import { prisma } from '../../config/database';

export class DashboardService {
  /**
   * Aggregate live tenant-specific metrics
   */
  async getDashboardMetrics(tenantId: string) {
    const [
      totalOrders,
      pendingOrders,
      completedOrders,
      orderAggregates,
      inventoryStats,
      recentOrders,
      recentEvents,
    ] = await Promise.all([
      // Total orders
      prisma.order.count({
        where: { tenant_id: tenantId },
      }),
      // Pending orders
      prisma.order.count({
        where: { tenant_id: tenantId, status: 'PENDING' },
      }),
      // Completed / Delivered orders
      prisma.order.count({
        where: {
          tenant_id: tenantId,
          status: { in: ['CONFIRMED', 'DELIVERED', 'SHIPPED'] },
        },
      }),
      // Total revenue
      prisma.order.aggregate({
        where: {
          tenant_id: tenantId,
          status: { not: 'CANCELLED' },
        },
        _sum: { total_amount: true },
        _avg: { total_amount: true },
      }),
      // Inventory summary
      prisma.inventory.aggregate({
        where: { tenant_id: tenantId },
        _sum: {
          quantity: true,
          reserved_quantity: true,
        },
        _count: { id: true },
      }),
      // Recent orders (using composite index on tenant_id, created_at DESC)
      prisma.order.findMany({
        where: { tenant_id: tenantId },
        include: {
          customer: { select: { name: true, email: true } },
          _count: { select: { items: true } },
        },
        orderBy: { created_at: 'desc' },
        take: 5,
      }),
      // Recent Kafka Processed Events
      prisma.processedEvent.findMany({
        where: { tenant_id: tenantId },
        orderBy: { processed_at: 'desc' },
        take: 5,
      }),
    ]);

    const totalStock = inventoryStats._sum.quantity || 0;
    const reservedStock = inventoryStats._sum.reserved_quantity || 0;

    return {
      summary: {
        totalOrders,
        pendingOrders,
        completedOrders,
        totalRevenue: Number(orderAggregates._sum.total_amount || 0),
        averageOrderValue: Number(orderAggregates._avg.total_amount || 0),
        totalStockUnits: totalStock,
        reservedStockUnits: reservedStock,
        availableStockUnits: totalStock - reservedStock,
        totalSkus: inventoryStats._count.id,
      },
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        customerName: o.customer.name,
        customerEmail: o.customer.email,
        status: o.status,
        totalAmount: Number(o.total_amount),
        itemCount: o._count.items,
        createdAt: o.created_at,
      })),
      recentEvents: recentEvents.map((e) => ({
        id: e.id,
        eventId: e.event_id,
        topic: e.topic,
        partition: e.partition,
        offset: e.offset.toString(),
        orderId: e.order_id,
        status: e.status,
        processedAt: e.processed_at,
      })),
    };
  }
}

export const dashboardService = new DashboardService();
