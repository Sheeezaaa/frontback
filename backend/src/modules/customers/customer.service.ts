import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { CreateCustomerInput } from './customer.dto';

export class CustomerService {
  async listCustomers(tenantId: string) {
    return prisma.customer.findMany({
      where: { tenant_id: tenantId },
      include: {
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getCustomerById(tenantId: string, id: string) {
    const customer = await prisma.customer.findFirst({
      where: { id, tenant_id: tenantId },
      include: { orders: { orderBy: { created_at: 'desc' }, take: 5 } },
    });

    if (!customer) {
      throw new AppError('Customer not found in your tenant records', 404);
    }

    return customer;
  }

  async createCustomer(tenantId: string, input: CreateCustomerInput) {
    return prisma.customer.create({
      data: {
        tenant_id: tenantId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address,
      },
    });
  }
}

export const customerService = new CustomerService();
