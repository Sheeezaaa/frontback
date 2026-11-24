import { Request, Response, NextFunction } from 'express';
import { orderService } from './order.service';
import { createOrderSchema, updateOrderStatusSchema } from './order.dto';
import { AppError } from '../../middleware/error.middleware';
import { OrderStatus } from '@prisma/client';

export class OrderController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantId) throw new AppError('Tenant context required', 400);

      const { page, limit, status, search } = req.query;
      const result = await orderService.listOrders(req.tenantId, {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
        status: status as OrderStatus,
        search: search as string,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantId) throw new AppError('Tenant context required', 400);

      const order = await orderService.getOrderById(req.tenantId, req.params.id as string);
      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/orders
   * Returns HTTP 202 Accepted after durable acceptance into PostgreSQL & Outbox
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantId) throw new AppError('Tenant context required', 400);

      const validated = createOrderSchema.parse(req.body);
      const result = await orderService.createOrder(req.tenantId, validated);

      res.status(202).json({
        success: true,
        message: 'Order accepted and queued for asynchronous Kafka processing',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantId) throw new AppError('Tenant context required', 400);

      const validated = updateOrderStatusSchema.parse(req.body);
      const updated = await orderService.updateOrderStatus(req.tenantId, req.params.id as string, validated);

      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async generateInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantId) throw new AppError('Tenant context required', 400);

      const result = await orderService.generateOrderInvoice(req.tenantId, req.params.id as string);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();
