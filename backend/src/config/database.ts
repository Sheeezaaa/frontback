import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { logger } from './logger';
import { env } from './env';

// Connection pooling configuration:
// Prisma manages an internal connection pool with connection_limit & pool_timeout.
// We also create a dedicated pg.Pool for session-bound operations (e.g. EXPLAIN ANALYZE connection switches).

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
  ],
});

// Real SQL Query Collector for empirical benchmark measurements
let activeQueryCollector: { count: number; queries: string[] } | null = null;

// @ts-ignore
prisma.$on('query', (e: any) => {
  if (activeQueryCollector) {
    activeQueryCollector.count++;
    activeQueryCollector.queries.push(e.query);
  }
});

export function startQueryCollector() {
  const collector = { count: 0, queries: [] as string[] };
  activeQueryCollector = collector;
  return {
    getCount: () => collector.count,
    stop: () => {
      const finalCount = collector.count;
      activeQueryCollector = null;
      return finalCount;
    },
  };
}

// Dedicated pg Pool for connection-pinned session operations
export const pgPool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

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
    await pgPool.end();
    logger.info('PostgreSQL connection pools disconnected');
  } catch (error) {
    logger.error('Error during database disconnection', error);
  }
}
