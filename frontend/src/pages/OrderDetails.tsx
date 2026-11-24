import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle,
  Truck,
  PackageCheck,
  XCircle,
  Building2,
  Calendar,
  Zap,
  Download,
  AlertCircle,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const OrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real Serverless invoice state
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState<any | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  const fetchOrder = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>(`/orders/${id}`);
      setOrder(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load order details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id, user]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.patch(`/orders/${id}/status`, { status: newStatus });
      fetchOrder();
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    }
  };

  const handleGenerateInvoice = async () => {
    if (!order) return;
    setInvoiceLoading(true);
    setInvoiceResult(null);
    setInvoiceError(null);

    const clientStart = performance.now();
    try {
      // Call real backend endpoint connected to the actual Serverless PDF generator
      const res: any = await api.post(`/orders/${id}/invoice`);
      const clientRoundtripMs = Number((performance.now() - clientStart).toFixed(2));

      setInvoiceResult({
        ...res,
        clientRoundtripMs,
      });
    } catch (err: any) {
      setInvoiceError(err.message || 'Serverless invoice generation failed');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!invoiceResult?.pdfDocument?.contentBase64) return;

    try {
      const byteCharacters = atob(invoiceResult.pdfDocument.contentBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = invoiceResult.pdfDocument.filename || `invoice-${order.orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to trigger PDF download', err);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-slate-400">Loading order details...</div>;
  }

  if (error || !order) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-center space-y-3">
        <p className="font-semibold">{error || 'Order not found'}</p>
        <Link to="/orders" className="text-xs font-bold underline">
          Return to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/orders"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800 font-mono tracking-tight">
                {order.orderNumber}
              </h1>
              <Badge variant="info">{order.status}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tenant: {user?.tenantName} | ID: {order.id}
            </p>
          </div>
        </div>

        {/* Real Serverless Invoice Button */}
        <button
          onClick={handleGenerateInvoice}
          disabled={invoiceLoading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
        >
          <FileText className="w-4 h-4 text-sky-400" />
          <span>{invoiceLoading ? 'Invoking Serverless...' : 'Generate Real PDF Invoice'}</span>
        </button>
      </div>

      {/* Invoice Error Alert */}
      {invoiceError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{invoiceError}</span>
        </div>
      )}

      {/* Real Serverless Telemetry Result Panel */}
      {invoiceResult && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 text-white border border-sky-800/60 shadow-lg space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-sm">Actual Serverless Cold/Warm Start Latency Measurements</h3>
            </div>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                invoiceResult.latency?.coldStart
                  ? 'bg-amber-900/60 text-amber-300 border-amber-600'
                  : 'bg-emerald-900/60 text-emerald-300 border-emerald-600'
              }`}
            >
              {invoiceResult.latency?.executionType}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
              <div className="text-slate-400 text-[10px]">Cold Start Flag</div>
              <div className="font-semibold text-white mt-0.5">
                {invoiceResult.latency?.coldStart ? 'TRUE (Cold Start)' : 'FALSE (Warm Start)'}
              </div>
            </div>
            <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
              <div className="text-slate-400 text-[10px]">Init Overhead</div>
              <div className="font-semibold text-amber-400 mt-0.5">
                {invoiceResult.latency?.initOverheadMs} ms
              </div>
            </div>
            <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
              <div className="text-slate-400 text-[10px]">PDF Render Duration</div>
              <div className="font-semibold text-emerald-400 mt-0.5">
                {invoiceResult.latency?.renderTimeMs} ms
              </div>
            </div>
            <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
              <div className="text-slate-400 text-[10px]">Total Server Time</div>
              <div className="font-semibold text-sky-400 mt-0.5">
                {invoiceResult.latency?.totalDurationMs} ms
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <span className="text-xs text-slate-300 font-mono">
              Generated: {invoiceResult.invoiceNumber} ({invoiceResult.pdfDocument?.sizeBytes} bytes)
            </span>
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Generated PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* Status Transition Toolbar */}
      <Card title="Update Order Lifecycle Status">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleStatusChange('PROCESSING')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors"
          >
            Mark Processing
          </button>
          <button
            onClick={() => handleStatusChange('CONFIRMED')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
          >
            Mark Confirmed
          </button>
          <button
            onClick={() => handleStatusChange('SHIPPED')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
          >
            Mark Shipped
          </button>
          <button
            onClick={() => handleStatusChange('DELIVERED')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors"
          >
            Mark Delivered
          </button>
          <button
            onClick={() => handleStatusChange('CANCELLED')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
          >
            Cancel Order
          </button>
        </div>
      </Card>

      {/* Customer & Order Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Customer Information">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Client Name:</span>
              <span className="font-semibold text-slate-800">{order.customer?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Email:</span>
              <span className="text-slate-800">{order.customer?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Phone:</span>
              <span className="text-slate-800">{order.customer?.phone || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Address:</span>
              <span className="text-slate-800">{order.customer?.address || 'N/A'}</span>
            </div>
          </div>
        </Card>

        <Card title="Order Summary">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Order Placed:</span>
              <span className="text-slate-800">
                {new Date(order.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Order Items:</span>
              <span className="font-semibold text-slate-800">{order.items?.length} SKUs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Value:</span>
              <span className="font-bold text-slate-900 text-sm">
                ${order.totalAmount?.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Notes:</span>
              <span className="text-slate-700 italic">{order.notes || 'None'}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Ordered Line Items Table */}
      <Card title="Purchased Products" className="!p-0">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-100">
            <tr>
              <th className="px-6 py-3 font-semibold">Product SKU</th>
              <th className="px-6 py-3 font-semibold">Item Description</th>
              <th className="px-6 py-3 font-semibold">Quantity</th>
              <th className="px-6 py-3 font-semibold">Unit Price</th>
              <th className="px-6 py-3 font-semibold text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order.items?.map((item: any) => (
              <tr key={item.id}>
                <td className="px-6 py-3.5 font-mono text-slate-700">{item.sku}</td>
                <td className="px-6 py-3.5 font-medium text-slate-900">{item.productName}</td>
                <td className="px-6 py-3.5 text-slate-700">{item.quantity}</td>
                <td className="px-6 py-3.5 text-slate-700">${item.unitPrice?.toFixed(2)}</td>
                <td className="px-6 py-3.5 text-right font-semibold text-slate-900">
                  ${item.subtotal?.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 border-t border-slate-200">
            <tr>
              <td colSpan={4} className="px-6 py-3 font-bold text-slate-800 text-right uppercase">
                Grand Total:
              </td>
              <td className="px-6 py-3 font-bold text-slate-900 text-right text-base">
                ${order.totalAmount?.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
};
