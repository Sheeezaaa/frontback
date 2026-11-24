import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/database';

describe('1. Authentication & Multi-Tenant Registration Suite', () => {
  const testCompanySlug = `test-comp-${Date.now()}`;
  const testEmail = `admin@${testCompanySlug}.com`;
  const testPassword = 'Password123!';

  afterAll(async () => {
    // Clean up test tenant
    const tenant = await prisma.tenant.findUnique({ where: { slug: testCompanySlug } });
    if (tenant) {
      await prisma.user.deleteMany({ where: { tenant_id: tenant.id } });
      await prisma.tenant.delete({ where: { id: tenant.id } });
    }
  });

  it('POST /api/v1/auth/register should register a new tenant and admin user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        companyName: 'Test Tech Corp',
        companySlug: testCompanySlug,
        email: testEmail,
        password: testPassword,
        firstName: 'Test',
        lastName: 'Admin',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.tenantSlug).toBe(testCompanySlug);
    expect(res.body.data.user.role).toBe('TENANT_ADMIN');
  });

  it('POST /api/v1/auth/register should reject duplicate company slug with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        companyName: 'Test Duplicate',
        companySlug: testCompanySlug,
        email: 'other@test.com',
        password: testPassword,
        firstName: 'Other',
        lastName: 'User',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/login should authenticate with valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('POST /api/v1/auth/login should reject invalid password with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'IncorrectPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/auth/me should reject unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
