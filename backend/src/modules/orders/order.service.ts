import { OrderStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { CreateOrderInput, UpdateOrderStatusInput } from './order.dto';
import { processOutboxQueue } from '../../kafka/outboxRelay';
import { logger } from '../../config/logger';

export class OrderService {
  /**
   * List orders for authenticated tenant with pagination and filtering
   * Uses composite index idx_orders_tenant_created (tenant_id, created_at DESC)
   */
  async listOrders(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      status?: OrderStatus;
      search?: string;
    }
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {
      tenant_id: tenantId,
    };

    if (options.status) {
      where.status = options.status;
    }

    if (options.search) {
      where.OR = [
        { order_number: { contains: options.search, mode: 'insensitive' } },
        { customer: { name: { contains: options.search, mode: 'insensitive' } } },
      ];
    }

    // Leverages composite index on (tenant_id, created_at DESC)
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      items: orders.map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        status: o.status,
        totalAmount: Number(o.total_amount),
        customer: o.customer,
        itemCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
        items: o.items.map((i) => ({
          id: i.id,
          productId: i.product_id,
          productName: i.product.name,
          sku: i.product.sku,
          quantity: i.quantity,
          unitPrice: Number(i.unit_price),
          subtotal: Number(i.subtotal),
        })),
        notes: o.notes,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single order by ID scoped to authenticated tenant
   */
  async getOrderById(tenantId: string, id: string) {
    const order = await prisma.order.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new AppError('Order not found in your tenant records', 404);
    }

    return {
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      totalAmount: Number(order.total_amount),
      customer: order.customer,
      notes: order.notes,
      items: order.items.map((i) => ({
        id: i.id,
        productId: i.product_id,
        productName: i.product.name,
        sku: i.product.sku,
        quantity: i.quantity,
        unitPrice: Number(i.unit_price),
        subtotal: Number(i.subtotal),
      })),
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    };
  }

  /**
   * Atomic Order Creation with Inventory Reservation and Transactional Outbox Event
   */
  async createOrder(tenantId: string, input: CreateOrderInput) {
    // 1. Verify customer belongs to this tenant
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, tenant_id: tenantId },
    });

    if (!customer) {
      throw new AppError('Customer not found in your tenant records', 404);
    }

    const eventId = uuidv4();
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    // 2. Execute atomic database transaction
    const createdOrder = await prisma.$transaction(async (tx) => {
      let orderTotal = 0;
      const orderItemsToCreate: any[] = [];
      const eventItemsPayload: any[] = [];

      for (const item of input.items) {
        // Fetch product with tenant_id check
        const product = await tx.product.findFirst({
          where: { id: item.productId, tenant_id: tenantId },
          include: { inventory: true },
        });

        if (!product) {
          throw new AppError(`Product with ID '${item.productId}' not found in your catalog`, 404);
        }

        if (product.status !== 'ACTIVE') {
          throw new AppError(`Product '${product.name}' is inactive and cannot be ordered`, 400);
        }

        const inv = product.inventory;
        if (!inv) {
          throw new AppError(`Inventory record missing for product '${product.name}'`, 400);
        }

        const availableStock = inv.quantity - inv.reserved_quantity;
        if (availableStock < item.quantity) {
          throw new AppError(
            `Insufficient stock for '${product.name}'. Available: ${availableStock}, Requested: ${item.quantity}`,
            400
          );
        }

        // Atomically reserve inventory to prevent overselling
        await tx.inventory.update({
          where: { id: inv.id },
          data: {
            reserved_quantity: { increment: item.quantity },
          },
        });

        const unitPrice = Number(product.price);
        const subtotal = unitPrice * item.quantity;
        orderTotal += subtotal;

        orderItemsToCreate.push({
          tenant_id: tenantId,
          product_id: product.id,
          quantity: item.quantity,
          unit_price: unitPrice,
          subtotal,
        });

        eventItemsPayload.push({
          productId: product.id,
          sku: product.sku,
          name: product.name,
          quantity: item.quantity,
          unitPrice,
          subtotal,
        });
      }

      // Create Order
      const order = await tx.order.create({
        data: {
          tenant_id: tenantId,
          customer_id: customer.id,
          order_number: orderNumber,
          status: OrderStatus.PENDING,
          total_amount: orderTotal,
          notes: input.notes,
          items: {
            create: orderItemsToCreate,
          },
        },
        include: {
          items: true,
          customer: true,
        },
      });

      // Insert Transactional Outbox Event
      const eventPayload = {
        eventId,
        eventType: 'OrderCreated',
        timestamp: new Date().toISOString(),
        tenantId,
        orderId: order.id,
        orderNumber: order.order_number,
        customerId: customer.id,
        totalAmount: orderTotal,
        items: eventItemsPayload,
      };

      await tx.outboxEvent.create({
        data: {
          id: eventId,
          tenant_id: tenantId,
          event_type: 'OrderCreated',
          aggregate_type: 'Order',
          aggregate_id: order.id,
          payload: eventPayload,
          status: 'PENDING',
        },
      });

      return order;
    });

    // 3. Trigger immediate Outbox Relay asynchronously (fire-and-forget; background relay catches any retries)
    processOutboxQueue().catch((err) => {
      logger.warn(`Asynchronous outbox dispatch deferral: ${err.message}`);
    });

    return {
      id: createdOrder.id,
      orderNumber: createdOrder.order_number,
      status: createdOrder.status,
      totalAmount: Number(createdOrder.total_amount),
      customer: createdOrder.customer,
      itemCount: createdOrder.items.length,
      eventId,
      acceptedAt: new Date().toISOString(),
      message: 'Order accepted for asynchronous processing via Apache Kafka',
    };
  }

  /**
   * Update order status scoped to authenticated tenant
   */
  async updateOrderStatus(tenantId: string, orderId: string, input: UpdateOrderStatusInput) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenant_id: tenantId },
      include: { items: true },
    });

    if (!order) {
      throw new AppError('Order not found in your tenant records', 404);
    }

    // If cancelling an unfulfilled order, release reserved inventory
    if (input.status === OrderStatus.CANCELLED && order.status === OrderStatus.PENDING) {
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.inventory.update({
            where: { product_id: item.product_id },
            data: {
              reserved_quantity: { decrement: item.quantity },
            },
          });
        }

        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.CANCELLED },
        });
      });
    } else {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: input.status },
      });
    }

    return this.getOrderById(tenantId, orderId);
  }
}

export const orderService = new OrderService();
