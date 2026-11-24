import React, { useState } from 'react';
import { Zap, Play, Database, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, BarChart3, Terminal } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const PerformanceBenchmark: React.FC = () => {
  const { user } = useAuth();

  const [sampleSize, setSampleSize] = useState<number>(30);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<any | null>(null);

  // EXPLAIN ANALYZE State
  const [isExplaining, setIsExplaining] = useState(false);
  const [explainResult, setExplainResult] = useState<any | null>(null);

  // Seeding State
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const handleRunNPlusOne = async () => {
    setIsBenchmarking(true);
    setBenchmarkResult(null);
    try {
      const res = await api.get<any>(`/performance/n-plus-one?sampleSize=${sampleSize}`);
      setBenchmarkResult(res.data);
    } catch (err: any) {
      alert(err.message || 'Benchmark execution failed');
    } finally {
      setIsBenchmarking(false);
    }
  };

  const handleRunExplainAnalyze = async () => {
    setIsExplaining(true);
    setExplainResult(null);
    try {
      const res = await api.get<any>('/performance/explain-analyze');
      setExplainResult(res.data);
    } catch (err: any) {
      alert(err.message || 'EXPLAIN ANALYZE failed');
    } finally {
      setIsExplaining(false);
    }
  };

  const handleSeedBenchmarkData = async (count: number) => {
    setIsSeeding(true);
    setSeedMessage(null);
    try {
      const res = await api.post<any>('/performance/seed-data', { count });
      setSeedMessage(`Successfully seeded ${count} sample orders for benchmark testing!`);
    } catch (err: any) {
      alert(err.message || 'Failed to seed benchmark data');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Database Performance Optimization & Benchmarking
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Empirical N+1 query measurement, composite index verification, and PostgreSQL EXPLAIN ANALYZE
            </p>
          </div>
        </div>
      </div>

      {/* Action / Pre-seed Toolbar */}
      <Card className="!p-4 bg-slate-900 text-white border-slate-800">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-sm">Benchmark Test Data Control</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Seed high-volume orders into <span className="text-sky-400 font-semibold">{user?.tenantName}</span> to demonstrate dramatic timing differentials.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSeedBenchmarkData(50)}
              disabled={isSeeding}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
            >
              {isSeeding ? 'Seeding...' : '+ Seed 50 Orders'}
            </button>
            <button
              onClick={() => handleSeedBenchmarkData(150)}
              disabled={isSeeding}
              className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {isSeeding ? 'Seeding...' : '+ Seed 150 Orders'}
            </button>
          </div>
        </div>
        {seedMessage && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs">
            {seedMessage}
          </div>
        )}
      </Card>

      {/* SECTION 1: N+1 BENCHMARK EXPERIMENT */}
      <Card
        title="1. N+1 Query Problem vs Eager Loading / SQL JOIN"
        subtitle="Measures actual query count and execution latency when fetching orders and line items"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Sample:</span>
            <select
              value={sampleSize}
              onChange={(e) => setSampleSize(parseInt(e.target.value, 10))}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 bg-white font-medium focus:ring-2 focus:ring-brand-500"
            >
              <option value="15">15 Orders</option>
              <option value="30">30 Orders</option>
              <option value="60">60 Orders</option>
              <option value="100">100 Orders</option>
            </select>
            <button
              onClick={handleRunNPlusOne}
              disabled={isBenchmarking}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isBenchmarking ? 'animate-spin' : ''}`} />
              <span>{isBenchmarking ? 'Running...' : 'Execute Comparison'}</span>
            </button>
          </div>
        }
      >
        {benchmarkResult ? (
          <div className="space-y-6">
            {/* Comparative Summary Pill */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Performance Optimization Gain
                </span>
                <div className="text-xl font-extrabold text-emerald-900 mt-0.5">
                  {benchmarkResult.comparison?.speedupMultiplier}x Faster Response Time
                </div>
                <div className="text-xs text-emerald-700 mt-1">
                  Saved <span className="font-bold">{benchmarkResult.comparison?.savedMs} ms</span> and eliminated{' '}
                  <span className="font-bold">{benchmarkResult.comparison?.queryReductionPct}%</span> of redundant database roundtrips.
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-600">
                  -{benchmarkResult.comparison?.queryReductionPct}%
                </span>
                <span className="block text-[11px] font-semibold text-emerald-700">Database Queries</span>
              </div>
            </div>

            {/* Side-by-Side Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Unoptimized Column */}
              <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <h4 className="font-bold text-xs text-rose-900 uppercase">
                      Unoptimized (N+1 Problem)
                    </h4>
                  </div>
                  <Badge variant="danger" size="sm">Sequential SELECTs</Badge>
                </div>
                <div className="text-xs text-rose-800 space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-rose-600">Total Roundtrips:</span>
                    <span className="font-bold text-rose-900">{benchmarkResult.unoptimized?.queryCount} queries</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rose-600">Execution Time:</span>
                    <span className="font-bold text-rose-900">{benchmarkResult.unoptimized?.durationMs} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rose-600">Pattern:</span>
                    <span>1 SELECT orders + N SELECT items</span>
                  </div>
                </div>
              </div>

              {/* Optimized Column */}
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-bold text-xs text-emerald-900 uppercase">
                      Optimized (Eager Load / JOIN)
                    </h4>
                  </div>
                  <Badge variant="success" size="sm">Single Batch</Badge>
                </div>
                <div className="text-xs text-emerald-800 space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-emerald-600">Total Roundtrips:</span>
                    <span className="font-bold text-emerald-900">{benchmarkResult.optimized?.queryCount} query</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-600">Execution Time:</span>
                    <span className="font-bold text-emerald-900">{benchmarkResult.optimized?.durationMs} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-600">Pattern:</span>
                    <span>Prisma batch include / SQL JOIN</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-xs">
            Select sample size and click <span className="font-semibold text-slate-700">"Execute Comparison"</span> to run live benchmark.
          </div>
        )}
      </Card>

      {/* SECTION 2: EXPLAIN ANALYZE COMPOSITE INDEX PROFILING */}
      <Card
        title="2. PostgreSQL EXPLAIN ANALYZE Execution Plan Inspection"
        subtitle="Verifies query plan execution for composite index idx_orders_tenant_created (tenant_id, created_at DESC)"
        action={
          <button
            onClick={handleRunExplainAnalyze}
            disabled={isExplaining}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            <Terminal className={`w-3.5 h-3.5 ${isExplaining ? 'animate-spin' : ''}`} />
            <span>{isExplaining ? 'Analyzing...' : 'Run EXPLAIN ANALYZE'}</span>
          </button>
        }
      >
        {explainResult ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <div>
                <span className="font-semibold text-slate-800">Composite Index:</span>{' '}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-brand-700">
                  {explainResult.indexName}
                </code>{' '}
                on <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">{explainResult.targetColumns}</code>
              </div>
              <Badge variant="purple" size="sm">PostgreSQL Execution Engine</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-bold text-emerald-700 mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>With Index (Index Scan / Bitmap Index Scan)</span>
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                  {explainResult.indexedExecutionPlan}
                </pre>
              </div>

              <div>
                <div className="text-xs font-bold text-rose-700 mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Without Index (Unindexed Sequential Scan)</span>
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-950 text-rose-300 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                  {explainResult.unindexedExecutionPlan}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-xs">
            Click <span className="font-semibold text-slate-700">"Run EXPLAIN ANALYZE"</span> to view real PostgreSQL optimizer execution trees.
          </div>
        )}
      </Card>
    </div>
  );
};
