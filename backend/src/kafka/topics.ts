export const KAFKA_TOPICS = {
  ORDERS: process.env.KAFKA_TOPIC_ORDERS || 'tenant.orders',
} as const;

export interface OrderItemPayload {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderCreatedPayload {
  eventId: string;
  eventType: 'OrderCreated';
  timestamp: string;
  tenantId: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  totalAmount: number;
  items: OrderItemPayload[];
}
