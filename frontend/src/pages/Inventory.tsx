import React, { useState, useEffect } from 'react';
import { Boxes, AlertTriangle, ArrowUpDown, Search, Warehouse } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';

export const Inventory: React.FC = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Stock Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [newLocation, setNewLocation] = useState('');

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (lowStockOnly) params.append('lowStockOnly', 'true');

      const res = await api.get<any[]>(`/inventory?${params.toString()}`);
      setInventory(res.data);
    } catch (err) {
      console.error('Failed to load inventory', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [user, lowStockOnly]);

  const handleOpenAdjust = (item: any) => {
    setSelectedItem(item);
    setAdjustmentAmount(0);
    setNewLocation(item.location);
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      await api.post('/inventory/adjust', {
        productId: selectedItem.productId,
        adjustment: adjustmentAmount,
        location: newLocation,
      });
      setIsAdjustModalOpen(false);
      fetchInventory();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust stock');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Inventory & Stock Tracking</h1>
          <p className="text-sm text-slate-500 mt-1">
            Warehouse levels scoped to <span className="font-semibold text-slate-700">{user?.tenantName}</span>
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="!p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by SKU or product name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
            />
            <span>Low Stock Only (≤ 10)</span>
          </label>

          <button
            onClick={fetchInventory}
            className="px-3.5 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 transition-colors"
          >
            Filter
          </button>
        </div>
      </Card>

      {/* Inventory Table */}
      <Card className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 font-semibold">SKU</th>
                <th className="px-6 py-3 font-semibold">Product Title</th>
                <th className="px-6 py-3 font-semibold">Warehouse</th>
                <th className="px-6 py-3 font-semibold">Total Units</th>
                <th className="px-6 py-3 font-semibold">Reserved Units</th>
                <th className="px-6 py-3 font-semibold">Available Units</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Adjustment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    Loading inventory...
                  </td>
                </tr>
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <Boxes className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <div>No inventory records match.</div>
                  </td>
                </tr>
              ) : (
                inventory.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-800">{inv.sku}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{inv.productName}</td>
                    <td className="px-6 py-4 text-slate-600 flex items-center gap-1.5">
                      <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                      <span>{inv.location}</span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{inv.quantity}</td>
                    <td className="px-6 py-4 text-amber-600 font-medium">
                      {inv.reservedQuantity} reserved
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-base text-slate-900">
                        {inv.availableQuantity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={inv.status === 'LOW_STOCK' ? 'warning' : 'success'} size="sm">
                        {inv.status === 'LOW_STOCK' ? 'LOW STOCK' : 'IN STOCK'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenAdjust(inv)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      >
                        <ArrowUpDown className="w-3 h-3" />
                        <span>Adjust</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title={`Adjust Stock: ${selectedItem?.sku}`}
      >
        <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Product:</span>
              <span className="font-semibold text-slate-800">{selectedItem?.productName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Total Units:</span>
              <span className="font-bold text-slate-900">{selectedItem?.quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Reserved (in active orders):</span>
              <span className="font-semibold text-amber-600">{selectedItem?.reservedQuantity}</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">
              Quantity Adjustment (+ to add, - to reduce)
            </label>
            <input
              type="number"
              required
              value={adjustmentAmount}
              onChange={(e) => setAdjustmentAmount(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
            <div className="text-[11px] text-slate-400 mt-1">
              Resulting total will be:{' '}
              <span className="font-bold text-slate-800">
                {(selectedItem?.quantity || 0) + adjustmentAmount} units
              </span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">
              Warehouse Location
            </label>
            <input
              type="text"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-sm"
            >
              Confirm Adjustment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
