import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { getProducer, disconnectProducer } from './kafka/producer';
import { startConsumer, stopConsumer } from './kafka/consumer';
import { startOutboxRelay, stopOutboxRelay } from './kafka/outboxRelay';

const PORT = env.PORT || 5000;

async function bootstrap() {
  try {
    logger.info('Initializing Multi-Tenant SaaS Backend Services...');

    // 1. Connect PostgreSQL via Prisma Connection Pool
    await connectDatabase();

    // 2. Connect Kafka Producer
    try {
      await getProducer();
      logger.info('Kafka Producer initialized');
    } catch (err: any) {
      logger.warn(`Kafka broker not immediately reachable (${err.message}). Outbox relay will retry.`);
    }

    // 3. Start Background Transactional Outbox Relay
    startOutboxRelay(3000);

    // 4. Start Kafka Consumer Group
    try {
      await startConsumer();
    } catch (err: any) {
      logger.warn(`Kafka Consumer deferred: ${err.message}`);
    }

    // 5. Start HTTP Express Server
    const server = app.listen(PORT, () => {
      logger.info(`Multi-Tenant SaaS Backend listening on http://localhost:${PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`Versioned API Base: http://localhost:${PORT}/api/v1`);
    });

    // Graceful Shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        // Stop background outbox relay
        stopOutboxRelay();

        // Disconnect Kafka Consumer and Producer
        await stopConsumer();
        await disconnectProducer();

        // Disconnect Database connection pool
        await disconnectDatabase();

        logger.info('Graceful shutdown completed successfully');
        process.exit(0);
      });

      // Force shutdown after timeout
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to bootstrap server', error);
    process.exit(1);
  }
}

bootstrap();
