import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, Plus, Trash2, ArrowLeft, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';

interface OrderItemLine {
  productId: string;
  quantity: number;
}

export const CreateOrder: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItemLine[]>([{ productId: '', quantity: 1 }]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  useEffect(() => {
    // Load tenant-specific customers and products
    Promise.all([
      api.get<any[]>('/customers'),
      api.get<any>('/products?limit=100'),
    ])
      .then(([custRes, prodRes]) => {
        setCustomers(custRes.data);
        if (custRes.data.length > 0) {
          setSelectedCustomerId(custRes.data[0].id);
        }
        setProducts(prodRes.data);
        if (prodRes.data.length > 0) {
          setOrderItems([{ productId: prodRes.data[0].id, quantity: 1 }]);
        }
      })
      .catch((err) => setError(err.message));
  }, [user]);

  const handleAddItem = () => {
    const firstAvailable = products[0]?.id || '';
    setOrderItems([...orderItems, { productId: firstAvailable, quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (orderItems.length === 1) return;
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof OrderItemLine, val: any) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: val };
    setOrderItems(updated);
  };

  // Calculate order total
  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => {
      const prod = products.find((p) => p.id === item.productId);
      const price = prod?.price || 0;
      return sum + price * (item.quantity || 0);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!selectedCustomerId) throw new Error('Please select a customer');
      if (orderItems.some((i) => !i.productId || i.quantity <= 0)) {
        throw new Error('Please select valid products and quantities');
      }

      const res = await api.post<any>('/orders', {
        customerId: selectedCustomerId,
        notes,
        items: orderItems,
      });

      // Successful 202 Accepted
      setSuccessResult(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    } finally {
      setIsLoading(false);
    }
  };

  if (successResult) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pt-6">
        <div className="p-8 rounded-2xl bg-white border border-emerald-100 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Order Accepted (HTTP 202)</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Order <span className="font-mono font-bold text-brand-600">{successResult.orderNumber}</span> has been durably persisted in PostgreSQL and published to Apache Kafka topic <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">tenant.orders</code>.
          </p>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-left text-xs space-y-1.5 max-w-md mx-auto">
            <div className="flex justify-between">
              <span className="text-slate-500">Order ID:</span>
              <span className="font-mono text-slate-800">{successResult.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Kafka Event ID:</span>
              <span className="font-mono text-slate-800">{successResult.eventId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Amount:</span>
              <span className="font-semibold text-slate-800">${successResult.totalAmount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Status:</span>
              <span className="font-bold text-amber-600">PENDING (Queued)</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-4">
            <Link
              to={`/orders/${successResult.id}`}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-xs font-semibold hover:bg-brand-700 transition-colors"
            >
              View Order Details
            </Link>
            <Link
              to="/events"
              className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Inspect Kafka Consumer Stream</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/orders"
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Create Sales Order</h1>
          <p className="text-xs text-slate-500">
            Tenant: <span className="font-semibold">{user?.tenantName}</span> | Atomic inventory reservation
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection */}
        <Card title="1. Select Customer">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              B2B Client Account
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>
        </Card>

        {/* Order Line Items */}
        <Card
          title="2. Order Items"
          action={
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          }
        >
          <div className="space-y-3">
            {orderItems.map((item, index) => {
              const selectedProduct = products.find((p) => p.id === item.productId);
              const maxAvailable = selectedProduct?.availableQuantity ?? 0;
              const lineTotal = (selectedProduct?.price || 0) * (item.quantity || 0);

              return (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80"
                >
                  <div className="flex-1 w-full sm:w-auto">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Product SKU / Title
                    </label>
                    <select
                      value={item.productId}
                      onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} - {p.name} (${p.price?.toFixed(2)}) [Stock: {p.availableQuantity}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-28">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Quantity (Avail: {maxAvailable})
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={maxAvailable > 0 ? maxAvailable : 1}
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, 'quantity', parseInt(e.target.value, 10) || 1)
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div className="w-28 text-right sm:pt-4">
                    <span className="text-[11px] text-slate-400 block sm:hidden">Line Total</span>
                    <span className="text-sm font-semibold text-slate-800">
                      ${lineTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="sm:pt-4">
                    <button
                      type="button"
                      disabled={orderItems.length === 1}
                      onClick={() => handleRemoveItem(index)}
                      className="p-2 text-slate-400 hover:text-rose-600 disabled:opacity-20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Grand Total
            </span>
            <span className="text-2xl font-bold text-slate-900">
              ${calculateTotal().toFixed(2)}
            </span>
          </div>
        </Card>

        {/* Notes & Submission */}
        <Card title="3. Additional Instructions">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Order Notes & Shipping Instructions
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special delivery instructions or PO references..."
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{isLoading ? 'Accepting Order & Queuing Kafka Event...' : 'Submit Order (HTTP 202)'}</span>
            </button>
          </div>
        </Card>
      </form>
    </div>
  );
};
