import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';

// Routes imports
import authRoutes from './modules/auth/auth.routes';
import productRoutes from './modules/products/product.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import customerRoutes from './modules/customers/customer.routes';
import orderRoutes from './modules/orders/order.routes';
import dashboardRoutes from './modules/analytics/dashboard.routes';
import eventRoutes from './modules/events/event.routes';
import tenantRoutes from './modules/tenants/tenant.routes';
import performanceRoutes from './modules/performance/benchmark.routes';

export const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later',
  },
});
app.use('/api', limiter);

// Body parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'saas-order-management-backend',
    environment: env.NODE_ENV,
  });
});

// Mount Versioned API routes (/api/v1)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/performance', performanceRoutes);

// Centralized error handling
app.use(errorHandler);
