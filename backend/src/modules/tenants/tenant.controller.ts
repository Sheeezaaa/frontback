import { Request, Response, NextFunction } from 'express';
import { tenantService } from './tenant.service';

export class TenantController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenants = await tenantService.listAllTenants();
      res.status(200).json({
        success: true,
        data: tenants,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = await tenantService.getTenantDetails(req.params.id as string);
      res.status(200).json({
        success: true,
        data: tenant,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.body;
      const tenant = await tenantService.updateTenantStatus(req.params.id as string, status);
      res.status(200).json({
        success: true,
        message: 'Tenant status updated',
        data: tenant,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const tenantController = new TenantController();
