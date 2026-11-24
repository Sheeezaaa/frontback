import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { CreateProductInput, UpdateProductInput } from './product.dto';

export class ProductService {
  /**
   * List all products for the authenticated tenant with pagination and search
   */
  async listProducts(
    tenantId: string,
    options: { page?: number; limit?: number; search?: string; category?: string }
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {
      tenant_id: tenantId,
      status: { not: 'ARCHIVED' },
    };

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { sku: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    if (options.category) {
      where.category = options.category;
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { inventory: true },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      items: items.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        category: p.category,
        status: p.status,
        quantity: p.inventory?.quantity ?? 0,
        reservedQuantity: p.inventory?.reserved_quantity ?? 0,
        availableQuantity: (p.inventory?.quantity ?? 0) - (p.inventory?.reserved_quantity ?? 0),
        location: p.inventory?.location ?? 'N/A',
        createdAt: p.created_at,
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
   * Get single product by ID scoped to authenticated tenant
   */
  async getProductById(tenantId: string, id: string) {
    const product = await prisma.product.findFirst({
      where: { id, tenant_id: tenantId },
      include: { inventory: true },
    });

    if (!product) {
      throw new AppError('Product not found in your tenant catalog', 404);
    }

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      category: product.category,
      status: product.status,
      quantity: product.inventory?.quantity ?? 0,
      reservedQuantity: product.inventory?.reserved_quantity ?? 0,
      availableQuantity: (product.inventory?.quantity ?? 0) - (product.inventory?.reserved_quantity ?? 0),
      location: product.inventory?.location ?? 'N/A',
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    };
  }

  /**
   * Create a new product and initialize inventory for the authenticated tenant
   */
  async createProduct(tenantId: string, input: CreateProductInput) {
    const existingSku = await prisma.product.findFirst({
      where: { tenant_id: tenantId, sku: input.sku },
    });

    if (existingSku) {
      throw new AppError(`A product with SKU '${input.sku}' already exists in your catalog`, 409);
    }

    const product = await prisma.product.create({
      data: {
        tenant_id: tenantId,
        sku: input.sku,
        name: input.name,
        description: input.description,
        price: input.price,
        category: input.category || 'General',
        status: 'ACTIVE',
        inventory: {
          create: {
            tenant_id: tenantId,
            quantity: input.initialQuantity,
            reserved_quantity: 0,
            location: input.location || 'Warehouse-A',
          },
        },
      },
      include: { inventory: true },
    });

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: Number(product.price),
      category: product.category,
      quantity: product.inventory?.quantity ?? 0,
    };
  }

  /**
   * Update product scoped to authenticated tenant
   */
  async updateProduct(tenantId: string, id: string, input: UpdateProductInput) {
    // Verify product belongs to tenant
    await this.getProductById(tenantId, id);

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        price: input.price,
        category: input.category,
        status: input.status,
      },
      include: { inventory: true },
    });

    return {
      id: updated.id,
      sku: updated.sku,
      name: updated.name,
      price: Number(updated.price),
      category: updated.category,
      status: updated.status,
    };
  }

  /**
   * Delete product (or archive) scoped to authenticated tenant
   */
  async deleteProduct(tenantId: string, id: string) {
    await this.getProductById(tenantId, id);

    // Check if product is in existing orders
    const orderCount = await prisma.orderItem.count({
      where: { product_id: id, tenant_id: tenantId },
    });

    if (orderCount > 0) {
      // Soft-archive to preserve historical orders
      await prisma.product.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      });
      return { id, archived: true };
    }

    await prisma.product.delete({
      where: { id },
    });

    return { id, deleted: true };
  }
}

export const productService = new ProductService();
