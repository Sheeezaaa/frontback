import { z } from 'zod';
import { OrderStatus } from '@prisma/client';

export const createOrderItemSchema = z.object({
  productId: z.string().uuid('Valid productId is required'),
  quantity: z.number().int().positive('Quantity must be greater than zero'),
});

export const createOrderSchema = z.object({
  customerId: z.string().uuid('Valid customerId is required'),
  notes: z.string().optional(),
  items: z.array(createOrderItemSchema).min(1, 'Order must contain at least one product item'),
});

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
