import { PrismaClient } from '@prisma/client';
import { logger } from './logger';
import { env } from './env';

// Connection pooling configuration:
// DATABASE_URL includes ?connection_limit=15&pool_timeout=10
// Prisma transparently manages an internal pg pool based on connection_limit query param.

export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' 
    ? [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ]
    : [{ emit: 'stdout', level: 'error' }],
});

if (env.NODE_ENV === 'development') {
  // @ts-ignore
  prisma.$on('query', (e: any) => {
    // Enable for debugging SQL queries during development
    // logger.debug(`SQL Query: ${e.query} - Duration: ${e.duration}ms`);
  });
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL connected successfully via Prisma Connection Pool');
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL database', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('PostgreSQL connection pool disconnected');
  } catch (error) {
    logger.error('Error during database disconnection', error);
  }
}
