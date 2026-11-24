import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/database';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

describe('2. Multi-Tenant Strict Isolation Suite (Tenant A vs Tenant B)', () => {
  let tenantA: any;
  let tenantB: any;
  let tokenA: string;
  let tokenB: string;
  let productA: any;
  let productB: any;
  let orderA: any;
  let orderB: any;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('TestPass123!', 10);

    // Setup Tenant A
    tenantA = await prisma.tenant.create({
      data: {
        name: 'Tenant Alpha Test',
        slug: `tenant-alpha-${Date.now()}`,
      },
    });

    const userA = await prisma.user.create({
      data: {
        tenant_id: tenantA.id,
        email: `admin@${tenantA.slug}.com`,
        password_hash: passwordHash,
        first_name: 'Alpha',
        last_name: 'Admin',
        role: Role.TENANT_ADMIN,
      },
    });

    // Setup Tenant B
    tenantB = await prisma.tenant.create({
      data: {
        name: 'Tenant Beta Test',
        slug: `tenant-beta-${Date.now()}`,
      },
    });

    const userB = await prisma.user.create({
      data: {
        tenant_id: tenantB.id,
        email: `admin@${tenantB.slug}.com`,
        password_hash: passwordHash,
        first_name: 'Beta',
        last_name: 'Admin',
        role: Role.TENANT_ADMIN,
      },
    });

    // Create Product for Tenant A
    productA = await prisma.product.create({
      data: {
        tenant_id: tenantA.id,
        sku: 'ALPHA-PROD-01',
        name: 'Alpha Confidential Server',
        price: 999.00,
        inventory: {
          create: {
            tenant_id: tenantA.id,
            quantity: 50,
            reserved_quantity: 0,
          },
        },
      },
    });

    // Create Product for Tenant B
    productB = await prisma.product.create({
      data: {
        tenant_id: tenantB.id,
        sku: 'BETA-PROD-01',
        name: 'Beta Luxury Handbag',
        price: 450.00,
        inventory: {
          create: {
            tenant_id: tenantB.id,
            quantity: 30,
            reserved_quantity: 0,
          },
        },
      },
    });

    // Create Customer & Order for Tenant A
    const customerA = await prisma.customer.create({
      data: {
        tenant_id: tenantA.id,
        name: 'Alpha Client Corp',
        email: 'alpha@client.com',
      },
    });

    orderA = await prisma.order.create({
      data: {
        tenant_id: tenantA.id,
        customer_id: customerA.id,
        order_number: 'ORD-ALPHA-001',
        total_amount: 999.00,
        status: 'CONFIRMED',
      },
    });

    // Create Customer & Order for Tenant B
    const customerB = await prisma.customer.create({
      data: {
        tenant_id: tenantB.id,
        name: 'Beta Boutique Client',
        email: 'beta@boutique.com',
      },
    });

    orderB = await prisma.order.create({
      data: {
        tenant_id: tenantB.id,
        customer_id: customerB.id,
        order_number: 'ORD-BETA-001',
        total_amount: 450.00,
        status: 'PENDING',
      },
    });

    // Login Tenant A
    const resLoginA = await request(app).post('/api/v1/auth/login').send({
      email: userA.email,
      password: 'TestPass123!',
    });
    tokenA = resLoginA.body.data.token;

    // Login Tenant B
    const resLoginB = await request(app).post('/api/v1/auth/login').send({
      email: userB.email,
      password: 'TestPass123!',
    });
    tokenB = resLoginB.body.data.token;
  });

  afterAll(async () => {
    // Teardown test tenants
    await prisma.order.deleteMany({ where: { tenant_id: { in: [tenantA.id, tenantB.id] } } });
    await prisma.customer.deleteMany({ where: { tenant_id: { in: [tenantA.id, tenantB.id] } } });
    await prisma.inventory.deleteMany({ where: { tenant_id: { in: [tenantA.id, tenantB.id] } } });
    await prisma.product.deleteMany({ where: { tenant_id: { in: [tenantA.id, tenantB.id] } } });
    await prisma.user.deleteMany({ where: { tenant_id: { in: [tenantA.id, tenantB.id] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
  });

  it('PROVE: Tenant A catalog does NOT list Tenant B products', async () => {
    const res = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const productIds = res.body.data.map((p: any) => p.id);
    expect(productIds).toContain(productA.id);
    expect(productIds).not.toContain(productB.id);
  });

  it('PROVE: Tenant A cannot read Tenant B product directly by ID (returns 404 without data leak)', async () => {
    const res = await request(app)
      .get(`/api/v1/products/${productB.id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('PROVE: Tenant A cannot update or modify Tenant B product (returns 404)', async () => {
    const res = await request(app)
      .put(`/api/v1/products/${productB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Hacked Beta Product Name',
        price: 1.00,
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);

    // Verify product B remained untouched in DB
    const checkB = await prisma.product.findUnique({ where: { id: productB.id } });
    expect(checkB?.name).toBe('Beta Luxury Handbag');
  });

  it('PROVE: Tenant A cannot delete Tenant B product (returns 404)', async () => {
    const res = await request(app)
      .delete(`/api/v1/products/${productB.id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
  });

  it('PROVE: Tenant A cannot read Tenant B order details (returns 404)', async () => {
    const res = await request(app)
      .get(`/api/v1/orders/${orderB.id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('PROVE: Tenant A forged header X-Tenant-Id for Tenant B is strictly rejected with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Id', tenantB.id);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Cross-tenant access violation');
  });
});
