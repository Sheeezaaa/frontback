import React, { useState, useEffect } from 'react';
import { Building2, LogOut, RefreshCw, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { api } from '../../api/client';

export const Topbar: React.FC = () => {
  const { user, logout, switchTenant, activeTenantId, quickDemoLogin } = useAuth();
  const [tenants, setTenants] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [showTenantMenu, setShowTenantMenu] = useState(false);

  useEffect(() => {
    // If super admin, fetch all tenants
    if (user?.role === 'SUPER_ADMIN') {
      api.get<any[]>('/tenants')
        .then((res) => setTenants(res.data))
        .catch(() => {});
    }
  }, [user]);

  const roleVariant = {
    SUPER_ADMIN: 'purple',
    TENANT_ADMIN: 'info',
    STAFF: 'default',
  }[user?.role || 'STAFF'] as any;

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between z-10">
      {/* Active Tenant Context Indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-700">
          <Building2 className="w-4 h-4 text-brand-600" />
          <span className="text-xs font-semibold text-slate-800">
            {user?.tenantName || 'Tenant Organization'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">({user?.tenantSlug})</span>
        </div>

        {/* Super Admin Tenant Context Switcher */}
        {user?.role === 'SUPER_ADMIN' && (
          <div className="relative">
            <button
              onClick={() => setShowTenantMenu(!showTenantMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
            >
              <span>Switch Tenant View</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showTenantMenu && (
              <div className="absolute left-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400">
                  Switch Active Tenant Scope
                </div>
                {tenants.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      switchTenant(t.id);
                      setShowTenantMenu(false);
                      window.location.reload();
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${
                      activeTenantId === t.id ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <span>{t.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{t.slug}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Information & Controls */}
      <div className="flex items-center gap-4">
        {/* Quick Demo Switcher Pill */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/80">
          <span className="text-[10px] font-semibold text-slate-500 uppercase px-2">Demo Preset:</span>
          <button
            onClick={() => quickDemoLogin('ABC_ADMIN')}
            className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
              user?.tenantSlug === 'abc-electronics'
                ? 'bg-white text-brand-700 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ABC Electronics
          </button>
          <button
            onClick={() => quickDemoLogin('XYZ_ADMIN')}
            className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
              user?.tenantSlug === 'xyz-fashion'
                ? 'bg-white text-brand-700 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            XYZ Fashion
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="text-right">
            <div className="text-xs font-semibold text-slate-800">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-[10px] text-slate-500">{user?.email}</div>
          </div>
          <Badge variant={roleVariant} size="sm">
            {user?.role?.replace('_', ' ')}
          </Badge>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          title="Sign Out"
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
