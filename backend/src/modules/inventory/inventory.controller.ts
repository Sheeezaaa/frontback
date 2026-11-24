import { Request, Response, NextFunction } from 'express';
import { inventoryService } from './inventory.service';
import { AppError } from '../../middleware/error.middleware';

export class InventoryController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantId) throw new AppError('Tenant context required', 400);

      const { lowStockOnly, search } = req.query;
      const items = await inventoryService.listInventory(req.tenantId, {
        lowStockOnly: lowStockOnly === 'true',
        search: search as string,
      });

      res.status(200).json({
        success: true,
        data: items,
      });
    } catch (error) {
      next(error);
    }
  }

  async adjust(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantId) throw new AppError('Tenant context required', 400);

      const { productId, adjustment, location } = req.body;
      if (!productId || typeof adjustment !== 'number') {
        throw new AppError('productId and numeric adjustment are required', 400);
      }

      const result = await inventoryService.adjustStock(
        req.tenantId,
        productId,
        adjustment,
        location
      );

      res.status(200).json({
        success: true,
        message: 'Stock adjusted successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const inventoryController = new InventoryController();
