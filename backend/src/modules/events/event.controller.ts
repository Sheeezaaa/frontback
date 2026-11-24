import { Request, Response, NextFunction } from 'express';
import { eventService } from './event.service';
import { AppError } from '../../middleware/error.middleware';

export class EventController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantId) throw new AppError('Tenant context required', 400);

      const data = await eventService.getEventMonitoringData(req.tenantId);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const eventController = new EventController();
