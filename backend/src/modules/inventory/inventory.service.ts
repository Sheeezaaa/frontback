import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';

export class InventoryService {
  /**
   * List inventory levels for the authenticated tenant
   */
  async listInventory(tenantId: string, options: { lowStockOnly?: boolean; search?: string }) {
    const where: any = {
      tenant_id: tenantId,
    };

    if (options.search) {
      where.product = {
        OR: [
          { name: { contains: options.search, mode: 'insensitive' } },
          { sku: { contains: options.search, mode: 'insensitive' } },
        ],
      };
    }

    const inventory = await prisma.inventory.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            price: true,
            category: true,
            status: true,
          },
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    const items = inventory.map((inv) => ({
      id: inv.id,
      productId: inv.product_id,
      sku: inv.product.sku,
      productName: inv.product.name,
      category: inv.product.category,
      price: Number(inv.product.price),
      quantity: inv.quantity,
      reservedQuantity: inv.reserved_quantity,
      availableQuantity: inv.quantity - inv.reserved_quantity,
      location: inv.location,
      status: (inv.quantity - inv.reserved_quantity) <= 10 ? 'LOW_STOCK' : 'IN_STOCK',
      updatedAt: inv.updated_at,
    }));

    if (options.lowStockOnly) {
      return items.filter((i) => i.status === 'LOW_STOCK');
    }

    return items;
  }

  /**
   * Adjust stock quantity directly for a product
   */
  async adjustStock(
    tenantId: string,
    productId: string,
    adjustment: number,
    location?: string
  ) {
    const existing = await prisma.inventory.findFirst({
      where: { product_id: productId, tenant_id: tenantId },
    });

    if (!existing) {
      throw new AppError('Inventory record not found for this product in your tenant', 404);
    }

    const newQuantity = existing.quantity + adjustment;
    if (newQuantity < existing.reserved_quantity) {
      throw new AppError(
        `Cannot reduce stock below reserved quantity (${existing.reserved_quantity})`,
        400
      );
    }

    const updated = await prisma.inventory.update({
      where: { id: existing.id },
      data: {
        quantity: newQuantity,
        ...(location ? { location } : {}),
      },
      include: { product: true },
    });

    return {
      productId: updated.product_id,
      sku: updated.product.sku,
      productName: updated.product.name,
      newQuantity: updated.quantity,
      reservedQuantity: updated.reserved_quantity,
      availableQuantity: updated.quantity - updated.reserved_quantity,
      location: updated.location,
    };
  }
}

export const inventoryService = new InventoryService();
