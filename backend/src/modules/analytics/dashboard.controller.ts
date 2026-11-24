import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service';
import { AppError } from '../../middleware/error.middleware';

export class DashboardController {
  async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantId) throw new AppError('Tenant context required', 400);

      const metrics = await dashboardService.getDashboardMetrics(req.tenantId);
      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
