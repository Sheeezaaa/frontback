import React, { useState, useEffect } from 'react';
import { Shield, Building2, Users, ShoppingCart, Package, Power, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const SuperAdminTenants: React.FC = () => {
  const { user, switchTenant, activeTenantId } = useAuth();
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any[]>('/tenants');
      setTenants(res.data);
    } catch (err) {
      console.error('Failed to load tenants', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [user]);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.patch(`/tenants/${id}/status`, { status: newStatus });
      fetchTenants();
    } catch (err: any) {
      alert(err.message || 'Failed to update tenant status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Super Admin Multi-Tenant Control Plane
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Platform-wide administration, tenant lifecycle, and cross-organization scope switcher
            </p>
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <Card title="Registered Tenant Organizations" className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 font-semibold">Tenant Organization</th>
                <th className="px-6 py-3 font-semibold">Slug Identifier</th>
                <th className="px-6 py-3 font-semibold">Plan</th>
                <th className="px-6 py-3 font-semibold">Users</th>
                <th className="px-6 py-3 font-semibold">Catalog Items</th>
                <th className="px-6 py-3 font-semibold">Total Orders</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    Loading tenants...
                  </td>
                </tr>
              ) : (
                tenants.map((t) => {
                  const isActive = activeTenantId === t.id;
                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isActive ? 'bg-purple-50/40' : ''
                      }`}
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-purple-600" />
                        <span>{t.name}</span>
                        {isActive && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                            Active Scope
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500">{t.slug}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {t.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t.userCount}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.productCount}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="flex items-center gap-1 font-semibold text-slate-800">
                          <ShoppingCart className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.orderCount}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={t.status === 'ACTIVE' ? 'success' : 'danger'} size="sm">
                          {t.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              switchTenant(t.id);
                              window.location.reload();
                            }}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-700 font-semibold transition-colors flex items-center gap-1"
                          >
                            <span>Switch Scope</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(t.id, t.status)}
                            className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Toggle Status"
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
