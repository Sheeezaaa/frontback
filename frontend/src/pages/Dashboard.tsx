import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ShoppingCart,
  Clock,
  CheckCircle2,
  Boxes,
  PlusCircle,
  Activity,
  ArrowRight,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<any>('/dashboard');
      setMetrics(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [user]);

  const statusVariant = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
      case 'DELIVERED':
        return 'success';
      case 'PROCESSING':
        return 'info';
      case 'PENDING':
        return 'warning';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-brand-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-400 bg-sky-950/80 px-2.5 py-0.5 rounded-full border border-sky-800">
              Active Tenant: {user?.tenantName}
            </span>
            <span className="text-xs text-slate-400 font-mono">[{user?.tenantSlug}]</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Order Operations Command Center</h1>
          <p className="text-sm text-slate-300 mt-1">
            Real-time multi-tenant metrics, event-driven Kafka order processing & inventory ledger.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMetrics}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/orders/new"
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-lg shadow-sm transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Order</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2">
            ${metrics?.summary?.totalRevenue?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span>Avg ticket:</span>
            <span className="font-semibold text-slate-700">
              ${metrics?.summary?.averageOrderValue?.toFixed(2) || '0.00'}
            </span>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Orders
            </span>
            <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2">
            {metrics?.summary?.totalOrders || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-600 font-semibold">{metrics?.summary?.completedOrders || 0}</span>
            <span>confirmed/fulfilled</span>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Orders
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2">
            {metrics?.summary?.pendingOrders || 0}
          </div>
          <div className="text-xs text-amber-600 font-medium mt-1">
            Awaiting Kafka consumer processing
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Inventory Units
            </span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2">
            {metrics?.summary?.availableStockUnits || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span>Reserved:</span>
            <span className="font-semibold text-purple-700">{metrics?.summary?.reservedStockUnits || 0}</span>
            <span>across {metrics?.summary?.totalSkus || 0} SKUs</span>
          </div>
        </Card>
      </div>

      {/* Two Column Layout: Recent Orders & Live Kafka Event Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table (2 Cols) */}
        <div className="lg:col-span-2">
          <Card
            title="Recent Orders"
            subtitle={`Filtered strictly to ${user?.tenantName}`}
            action={
              <Link
                to="/orders"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-y border-slate-100">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Order Number</th>
                    <th className="px-6 py-3 font-semibold">Customer</th>
                    <th className="px-6 py-3 font-semibold">Items</th>
                    <th className="px-6 py-3 font-semibold">Total</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics?.recentOrders?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        No orders recorded for this tenant yet.
                      </td>
                    </tr>
                  ) : (
                    metrics?.recentOrders?.map((order: any) => (
                      <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-3.5 font-mono font-medium text-brand-600">
                          <Link to={`/orders/${order.id}`} className="hover:underline">
                            {order.orderNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="font-medium text-slate-800">{order.customerName}</div>
                          <div className="text-[11px] text-slate-400">{order.customerEmail}</div>
                        </td>
                        <td className="px-6 py-3.5 text-slate-600">{order.itemCount} items</td>
                        <td className="px-6 py-3.5 font-semibold text-slate-800">
                          ${order.totalAmount?.toFixed(2)}
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge variant={statusVariant(order.status) as any}>
                            {order.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Live Event Stream Ledger (1 Col) */}
        <div>
          <Card
            title="Kafka Processed Events"
            subtitle="Idempotent consumer ledger (tenant.orders)"
            action={
              <Link
                to="/events"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <span>Live Feed</span>
                <Activity className="w-3.5 h-3.5" />
              </Link>
            }
          >
            <div className="space-y-3">
              {metrics?.recentEvents?.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No Kafka events processed yet for this tenant.
                </div>
              ) : (
                metrics?.recentEvents?.map((evt: any) => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 font-mono text-[11px]">
                        Offset #{evt.offset}
                      </span>
                      <Badge variant="success" size="sm">
                        {evt.status}
                      </Badge>
                    </div>
                    <div className="text-slate-500 text-[11px] font-mono truncate">
                      Topic: {evt.topic} (p:{evt.partition})
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Processed at: {new Date(evt.processedAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}

              <div className="pt-2">
                <Link
                  to="/performance"
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Run Database Benchmark (N+1 vs JOIN)</span>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
