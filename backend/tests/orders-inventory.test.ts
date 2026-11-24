import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/database';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

describe('3. Order Management & Inventory Concurrency Suite', () => {
  let tenant: any;
  let token: string;
  let customer: any;
  let product: any;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('Secret123!', 10);

    tenant = await prisma.tenant.create({
      data: {
        name: 'Order Test Tenant',
        slug: `order-tenant-${Date.now()}`,
      },
    });

    const user = await prisma.user.create({
      data: {
        tenant_id: tenant.id,
        email: `admin@${tenant.slug}.com`,
        password_hash: passwordHash,
        first_name: 'Order',
        last_name: 'Admin',
        role: Role.TENANT_ADMIN,
      },
    });

    customer = await prisma.customer.create({
      data: {
        tenant_id: tenant.id,
        name: 'Enterprise Client',
        email: 'client@enterprise.com',
      },
    });

    product = await prisma.product.create({
      data: {
        tenant_id: tenant.id,
        sku: 'ORDER-STOCK-PROD',
        name: 'High Demand Widget',
        price: 100.00,
        inventory: {
          create: {
            tenant_id: tenant.id,
            quantity: 10,
            reserved_quantity: 0,
          },
        },
      },
    });

    const resLogin = await request(app).post('/api/v1/auth/login').send({
      email: user.email,
      password: 'Secret123!',
    });
    token = resLogin.body.data.token;
  });

  afterAll(async () => {
    await prisma.outboxEvent.deleteMany({ where: { tenant_id: tenant.id } });
    await prisma.orderItem.deleteMany({ where: { tenant_id: tenant.id } });
    await prisma.order.deleteMany({ where: { tenant_id: tenant.id } });
    await prisma.customer.deleteMany({ where: { tenant_id: tenant.id } });
    await prisma.inventory.deleteMany({ where: { tenant_id: tenant.id } });
    await prisma.product.deleteMany({ where: { tenant_id: tenant.id } });
    await prisma.user.deleteMany({ where: { tenant_id: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
  });

  it('POST /api/v1/orders creates order, reserves inventory, creates Outbox event, and returns HTTP 202 Accepted', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: customer.id,
        notes: 'Priority batch order',
        items: [
          {
            productId: product.id,
            quantity: 4,
          },
        ],
      });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderNumber).toBeDefined();
    expect(res.body.data.totalAmount).toBe(400);

    // Verify inventory reservation in DB
    const inv = await prisma.inventory.findUnique({ where: { product_id: product.id } });
    expect(inv?.quantity).toBe(10);
    expect(inv?.reserved_quantity).toBe(4);

    // Verify Outbox Event created
    const outbox = await prisma.outboxEvent.findFirst({
      where: { aggregate_id: res.body.data.id },
    });
    expect(outbox).toBeDefined();
    expect(outbox?.event_type).toBe('OrderCreated');
  });

  it('POST /api/v1/orders strictly prevents overselling when requested quantity exceeds available stock', async () => {
    // Available stock is currently 10 - 4 = 6
    // Attempt to order 8 widgets
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: customer.id,
        items: [
          {
            productId: product.id,
            quantity: 8,
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Insufficient stock');
  });
});
