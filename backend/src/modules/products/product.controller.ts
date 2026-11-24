import { Request, Response, NextFunction } from 'express';
import { productService } from './product.service';
import { createProductSchema, updateProductSchema } from './product.dto';
import { AppError } from '../../middleware/error.middleware';

export class ProductController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantId) throw new AppError('Tenant context required', 400);

      const { page, limit, search, category } = req.query;
      const result = await productService.listProducts(req.tenantId, {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
        search: search as string,
        category: category as string,
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

      const product = await productService.getProductById(req.tenantId, req.params.id as string);
      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantId) throw new AppError('Tenant context required', 400);

      const validated = createProductSchema.parse(req.body);
      const product = await productService.createProduct(req.tenantId, validated);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantId) throw new AppError('Tenant context required', 400);

      const validated = updateProductSchema.parse(req.body);
      const product = await productService.updateProduct(req.tenantId, req.params.id as string, validated);

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantId) throw new AppError('Tenant context required', 400);

      const result = await productService.deleteProduct(req.tenantId, req.params.id as string);
      res.status(200).json({
        success: true,
        message: result.archived ? 'Product archived' : 'Product deleted successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
