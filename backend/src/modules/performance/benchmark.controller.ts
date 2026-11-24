import { Request, Response, NextFunction } from 'express';
import { benchmarkService } from './benchmark.service';
import { AppError } from '../../middleware/error.middleware';

export class BenchmarkController {
  async runNPlusOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantId) throw new AppError('Tenant context required', 400);

      const sampleSize = req.query.sampleSize ? parseInt(req.query.sampleSize as string, 10) : 30;
      const result = await benchmarkService.runNPlusOneBenchmark(req.tenantId, sampleSize);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async runExplainAnalyze(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantId) throw new AppError('Tenant context required', 400);

      const result = await benchmarkService.runExplainAnalyze(req.tenantId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async seedData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantId) throw new AppError('Tenant context required', 400);

      const count = req.body.count ? parseInt(req.body.count, 10) : 50;
      const result = await benchmarkService.seedBenchmarkOrders(req.tenantId, count);

      res.status(201).json({
        success: true,
        message: `Successfully seeded ${result.seededCount} benchmark orders`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const benchmarkController = new BenchmarkController();
