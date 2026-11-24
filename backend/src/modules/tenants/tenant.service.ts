import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';

export class TenantService {
  async listAllTenants() {
    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            users: true,
            products: true,
            orders: true,
            customers: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      status: t.status,
      userCount: t._count.users,
      productCount: t._count.products,
      orderCount: t._count.orders,
      customerCount: t._count.customers,
      createdAt: t.created_at,
    }));
  }

  async getTenantDetails(id: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, email: true, first_name: true, last_name: true, role: true, is_active: true } },
        _count: {
          select: { products: true, orders: true, customers: true },
        },
      },
    });

    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    return tenant;
  }

  async updateTenantStatus(id: string, status: string) {
    return prisma.tenant.update({
      where: { id },
      data: { status },
    });
  }
}

export const tenantService = new TenantService();
