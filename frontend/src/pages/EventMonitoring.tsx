import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, CheckCircle2, Clock, Zap, AlertTriangle, Layers } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const EventMonitoring: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>('/events');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load event monitoring data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // Poll every 5s for live consumer progress
    const interval = setInterval(fetchEvents, 5000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Apache Kafka Event Monitoring
            </h1>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Topic: <code className="bg-slate-200 px-1 py-0.5 rounded text-xs font-mono font-bold">tenant.orders</code> | Consumer Group: <code className="bg-slate-200 px-1 py-0.5 rounded text-xs font-mono font-bold">saas-order-consumer-group</code>
          </p>
        </div>

        <button
          onClick={fetchEvents}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Consumer Idempotent Processed
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {data?.processedEvents?.length || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Recorded in ProcessedEvents ledger
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Outbox Published Events
            </span>
            <Zap className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {data?.outboxStats?.PUBLISHED || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Durable Kafka publications
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Outbox Pending / Queue
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {data?.outboxStats?.PENDING || 0}
          </div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">
            Transactional Relay Worker
          </div>
        </Card>
      </div>

      {/* Processed Events Ledger Table */}
      <Card
        title="1. Consumer Idempotency Ledger (ProcessedEvents)"
        subtitle="Guarantees exact-once processing semantics; duplicate partition offsets are safely ignored"
        className="!p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 font-semibold">Event ID</th>
                <th className="px-6 py-3 font-semibold">Topic</th>
                <th className="px-6 py-3 font-semibold">Partition</th>
                <th className="px-6 py-3 font-semibold">Offset</th>
                <th className="px-6 py-3 font-semibold">Order ID</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Processed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.processedEvents?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No Kafka events consumed yet for this tenant.
                  </td>
                </tr>
              ) : (
                data?.processedEvents?.map((evt: any) => (
                  <tr key={evt.id} className="hover:bg-slate-50/70 transition-colors font-mono">
                    <td className="px-6 py-3 text-slate-600 truncate max-w-xs">{evt.eventId}</td>
                    <td className="px-6 py-3 font-sans font-medium text-brand-600">{evt.topic}</td>
                    <td className="px-6 py-3 text-slate-800">{evt.partition}</td>
                    <td className="px-6 py-3 font-bold text-slate-900">#{evt.offset}</td>
                    <td className="px-6 py-3 text-slate-500 truncate max-w-xs">{evt.orderId || 'N/A'}</td>
                    <td className="px-6 py-3 font-sans">
                      <Badge variant="success" size="sm">{evt.status}</Badge>
                    </td>
                    <td className="px-6 py-3 text-slate-400 font-sans">
                      {new Date(evt.processedAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Transactional Outbox Events Table */}
      <Card
        title="2. Transactional Outbox Queue (OutboxEvents)"
        subtitle="Prevents event loss when database transactions commit but Kafka broker is temporarily offline"
        className="!p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 font-semibold">Event Type</th>
                <th className="px-6 py-3 font-semibold">Aggregate ID</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Retries</th>
                <th className="px-6 py-3 font-semibold">Created At</th>
                <th className="px-6 py-3 font-semibold">Published At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.outboxEvents?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No outbox events recorded.
                  </td>
                </tr>
              ) : (
                data?.outboxEvents?.map((out: any) => (
                  <tr key={out.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3 font-semibold text-slate-800 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-brand-600" />
                      <span>{out.eventType}</span>
                    </td>
                    <td className="px-6 py-3 font-mono text-slate-500 truncate max-w-xs">
                      {out.aggregateId}
                    </td>
                    <td className="px-6 py-3">
                      <Badge
                        variant={
                          out.status === 'PUBLISHED'
                            ? 'success'
                            : out.status === 'PENDING'
                            ? 'warning'
                            : 'danger'
                        }
                        size="sm"
                      >
                        {out.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 font-mono text-slate-700">{out.retryCount}</td>
                    <td className="px-6 py-3 text-slate-500">
                      {new Date(out.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      {out.publishedAt ? new Date(out.publishedAt).toLocaleTimeString() : 'Awaiting Relay'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
