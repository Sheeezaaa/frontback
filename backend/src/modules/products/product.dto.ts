import { z } from 'zod';

export const createProductSchema = z.object({
  sku: z.string().min(2, 'SKU must be at least 2 characters').toUpperCase(),
  name: z.string().min(2, 'Product name is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be greater than zero'),
  category: z.string().optional().default('General'),
  initialQuantity: z.number().int().nonnegative('Initial quantity must be non-negative').default(0),
  location: z.string().optional().default('Warehouse-A'),
});

export const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  category: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
