import { prisma, pgPool, startQueryCollector } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';

export interface BenchmarkResult {
  unoptimized: {
    strategy: string;
    queryCount: number;
    durationMs: number;
    recordCount: number;
  };
  optimized: {
    strategy: string;
    queryCount: number;
    durationMs: number;
    recordCount: number;
  };
  comparison: {
    queryReductionPct: number;
    speedupMultiplier: number;
    savedMs: number;
  };
}

export class BenchmarkService {
  /**
   * Compare unoptimized N+1 queries vs optimized eager loaded queries
   * Measures the ACTUAL SQL query count executed in PostgreSQL via Prisma's query telemetry
   */
  async runNPlusOneBenchmark(tenantId: string, sampleSize = 30): Promise<BenchmarkResult> {
    // 1. UNOPTIMIZED N+1 RUN WITH REAL QUERY COUNTING
    const unoptimizedCollector = startQueryCollector();
    const unoptimizedStart = performance.now();

    // Step A: Fetch Orders alone (1 query)
    const rawOrders = await prisma.order.findMany({
      where: { tenant_id: tenantId },
      take: sampleSize,
      orderBy: { created_at: 'desc' },
    });

    // Step B: Loop through every order and issue individual SELECT for items (N queries)
    const unoptimizedOrdersWithItems = [];
    for (const order of rawOrders) {
      const items = await prisma.orderItem.findMany({
        where: { order_id: order.id, tenant_id: tenantId },
      });
      unoptimizedOrdersWithItems.push({ ...order, items });
    }

    const unoptimizedDuration = Number((performance.now() - unoptimizedStart).toFixed(2));
    // Collect the ACTUAL number of SQL queries fired
    const unoptimizedQueryCount = unoptimizedCollector.stop();

    // 2. OPTIMIZED EAGER LOADING / JOIN RUN WITH REAL QUERY COUNTING
    const optimizedCollector = startQueryCollector();
    const optimizedStart = performance.now();

    // Step A: Fetch orders and items in batch eager loading
    const optimizedOrders = await prisma.order.findMany({
      where: { tenant_id: tenantId },
      include: { items: true },
      take: sampleSize,
      orderBy: { created_at: 'desc' },
    });

    const optimizedDuration = Number((performance.now() - optimizedStart).toFixed(2));
    // Collect the ACTUAL number of SQL queries fired by the optimized pattern
    const optimizedQueryCount = optimizedCollector.stop();

    // 3. REAL PERFORMANCE METRICS
    const savedMs = Number((unoptimizedDuration - optimizedDuration).toFixed(2));
    const speedupMultiplier = optimizedDuration > 0
      ? Number((unoptimizedDuration / optimizedDuration).toFixed(2))
      : 1;

    const queryReductionPct = unoptimizedQueryCount > 0
      ? Number((((unoptimizedQueryCount - optimizedQueryCount) / unoptimizedQueryCount) * 100).toFixed(1))
      : 0;

    return {
      unoptimized: {
        strategy: 'Sequential N+1 Individual SELECTs',
        queryCount: unoptimizedQueryCount,
        durationMs: unoptimizedDuration,
        recordCount: unoptimizedOrdersWithItems.length,
      },
      optimized: {
        strategy: 'Batched Relation Eager Loading / SQL JOIN',
        queryCount: optimizedQueryCount,
        durationMs: optimizedDuration,
        recordCount: optimizedOrders.length,
      },
      comparison: {
        queryReductionPct,
        speedupMultiplier,
        savedMs,
      },
    };
  }

  /**
   * Run real PostgreSQL EXPLAIN ANALYZE comparison on composite index idx_orders_tenant_created
   * Uses the EXACT SAME database connection for session parameters (SET enable_indexscan)
   * Uses parameterized queries ($1) for tenant ID to prevent SQL injection
   */
  async runExplainAnalyze(tenantId: string) {
    // Acquire dedicated connection from pg pool to guarantee session-bound SET commands
    const client = await pgPool.connect();

    try {
      const explainQuery = `
        EXPLAIN (ANALYZE, BUFFERS, COSTS)
        SELECT * FROM orders
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT 50;
      `;

      // 1. Plan with Index Enabled (Default) using Parameterized SQL ($1)
      const indexedResult = await client.query(explainQuery, [tenantId]);
      const indexedPlanText = indexedResult.rows.map((r: any) => r['QUERY PLAN']).join('\n');

      // 2. On the EXACT SAME connection, disable index scanning to inspect sequential table scan
      await client.query('SET enable_indexscan = OFF;');
      await client.query('SET enable_bitmapscan = OFF;');

      const unindexedResult = await client.query(explainQuery, [tenantId]);
      const unindexedPlanText = unindexedResult.rows.map((r: any) => r['QUERY PLAN']).join('\n');

      // 3. Reset optimizer flags on the same connection before releasing back to pool
      await client.query('SET enable_indexscan = ON;');
      await client.query('SET enable_bitmapscan = ON;');

      return {
        indexName: 'idx_orders_tenant_created',
        targetColumns: '(tenant_id, created_at DESC)',
        indexedExecutionPlan: indexedPlanText,
        unindexedExecutionPlan: unindexedPlanText,
        status: 'SUCCESS',
      };
    } catch (error: any) {
      // Always ensure flags are reset even on query error
      try {
        await client.query('SET enable_indexscan = ON; SET enable_bitmapscan = ON;');
      } catch {}

      throw new AppError(`PostgreSQL EXPLAIN ANALYZE execution failed: ${error.message}`, 500);
    } finally {
      // Release connection back to pool
      client.release();
    }
  }

  /**
   * Seed bulk orders for testing real high-volume benchmark differences
   */
  async seedBenchmarkOrders(tenantId: string, count = 50) {
    const customer = await prisma.customer.findFirst({
      where: { tenant_id: tenantId },
    });
    const product = await prisma.product.findFirst({
      where: { tenant_id: tenantId },
    });

    if (!customer || !product) {
      throw new AppError('Customer or Product missing for this tenant. Run seed first.', 400);
    }

    const created = [];
    for (let i = 0; i < count; i++) {
      const order = await prisma.order.create({
        data: {
          tenant_id: tenantId,
          customer_id: customer.id,
          order_number: `BENCH-${Date.now().toString().slice(-4)}-${i + 1}`,
          status: 'CONFIRMED',
          total_amount: Number(product.price) * 2,
          items: {
            create: [
              {
                tenant_id: tenantId,
                product_id: product.id,
                quantity: 2,
                unit_price: product.price,
                subtotal: Number(product.price) * 2,
              },
            ],
          },
        },
      });
      created.push(order.id);
    }

    return { seededCount: created.length };
  }
}

export const benchmarkService = new BenchmarkService();
