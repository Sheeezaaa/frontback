import { handleOrderEvent } from '../src/kafka/consumer';
import { prisma } from '../src/config/database';
import { v4 as uuidv4 } from 'uuid';

describe('4. Kafka Event Processing & Idempotency Ledger Suite', () => {
  let tenant: any;
  let customer: any;
  let product: any;
  let order: any;
  const eventId = uuidv4();
  const testTopic = 'tenant.orders';
  const testPartition = 0;
  const testOffset = '1042';

  beforeAll(async () => {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Kafka Test Tenant',
        slug: `kafka-tenant-${Date.now()}`,
      },
    });

    customer = await prisma.customer.create({
      data: {
        tenant_id: tenant.id,
        name: 'Kafka Customer',
        email: 'kafka@test.com',
      },
    });

    product = await prisma.product.create({
      data: {
        tenant_id: tenant.id,
        sku: 'KAFKA-PROD-99',
        name: 'Kafka Stream Item',
        price: 50.00,
        inventory: {
          create: {
            tenant_id: tenant.id,
            quantity: 20,
            reserved_quantity: 2, // Previously reserved by order creation
          },
        },
      },
    });

    order = await prisma.order.create({
      data: {
        tenant_id: tenant.id,
        customer_id: customer.id,
        order_number: 'ORD-KAFKA-100',
        status: 'PENDING',
        total_amount: 100.00,
        items: {
          create: [
            {
              tenant_id: tenant.id,
              product_id: product.id,
              quantity: 2,
              unit_price: 50.00,
              subtotal: 100.00,
            },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.processedEvent.deleteMany({ where: { tenant_id: tenant.id } });
    await prisma.orderItem.deleteMany({ where: { tenant_id: tenant.id } });
    await prisma.order.deleteMany({ where: { tenant_id: tenant.id } });
    await prisma.customer.deleteMany({ where: { tenant_id: tenant.id } });
    await prisma.inventory.deleteMany({ where: { tenant_id: tenant.id } });
    await prisma.product.deleteMany({ where: { tenant_id: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
  });

  it('Consumer processes OrderCreated event, deducts inventory, transitions status to PROCESSING, and records idempotency', async () => {
    const eventPayload = {
      eventId,
      eventType: 'OrderCreated',
      timestamp: new Date().toISOString(),
      tenantId: tenant.id,
      orderId: order.id,
      orderNumber: order.order_number,
      customerId: customer.id,
      totalAmount: 100.00,
      items: [
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          quantity: 2,
          unitPrice: 50.00,
          subtotal: 100.00,
        },
      ],
    };

    // Simulate Kafka consumer delivering message
    await handleOrderEvent({
      topic: testTopic,
      partition: testPartition,
      message: {
        key: Buffer.from(tenant.id),
        value: Buffer.from(JSON.stringify(eventPayload)),
        offset: testOffset,
        timestamp: `${Date.now()}`,
        attributes: 0,
      },
      heartbeat: async () => {},
      pause: () => () => {},
    });

    // Verify order status changed to PROCESSING
    const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updatedOrder?.status).toBe('PROCESSING');

    // Verify inventory finalized: quantity reduced by 2 (20 -> 18), reserved_quantity reduced by 2 (2 -> 0)
    const updatedInv = await prisma.inventory.findUnique({ where: { product_id: product.id } });
    expect(updatedInv?.quantity).toBe(18);
    expect(updatedInv?.reserved_quantity).toBe(0);

    // Verify record in ProcessedEvents table
    const processed = await prisma.processedEvent.findUnique({ where: { event_id: eventId } });
    expect(processed).toBeDefined();
    expect(processed?.topic).toBe(testTopic);
    expect(processed?.offset.toString()).toBe(testOffset);
  });

  it('Consumer idempotently detects replay of duplicate event and does NOT double-deduct inventory', async () => {
    const eventPayload = {
      eventId,
      eventType: 'OrderCreated',
      timestamp: new Date().toISOString(),
      tenantId: tenant.id,
      orderId: order.id,
      orderNumber: order.order_number,
      customerId: customer.id,
      totalAmount: 100.00,
      items: [
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          quantity: 2,
          unitPrice: 50.00,
          subtotal: 100.00,
        },
      ],
    };

    // Deliver same event second time
    await handleOrderEvent({
      topic: testTopic,
      partition: testPartition,
      message: {
        key: Buffer.from(tenant.id),
        value: Buffer.from(JSON.stringify(eventPayload)),
        offset: testOffset,
        timestamp: `${Date.now()}`,
        attributes: 0,
      },
      heartbeat: async () => {},
      pause: () => () => {},
    });

    // Check inventory: must still be 18, NOT 16!
    const checkInv = await prisma.inventory.findUnique({ where: { product_id: product.id } });
    expect(checkInv?.quantity).toBe(18);
  });

  it('Consumer rejects event when tenant_id does not own the target order', async () => {
    const maliciousPayload = {
      eventId: uuidv4(),
      eventType: 'OrderCreated',
      timestamp: new Date().toISOString(),
      tenantId: 'forged-tenant-id-999',
      orderId: order.id,
      orderNumber: order.order_number,
      customerId: customer.id,
      totalAmount: 100.00,
      items: [
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          quantity: 1,
          unitPrice: 50.00,
          subtotal: 50.00,
        },
      ],
    };

    await expect(
      handleOrderEvent({
        topic: testTopic,
        partition: testPartition,
        message: {
          key: Buffer.from('forged-tenant-id-999'),
          value: Buffer.from(JSON.stringify(maliciousPayload)),
          offset: '9999',
          timestamp: `${Date.now()}`,
          attributes: 0,
        },
        heartbeat: async () => {},
        pause: () => () => {},
      })
    ).rejects.toThrow(/Security Violation: Order/);
  });
});
