import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  PlusCircle,
  Package,
  Boxes,
  Users,
  Activity,
  Zap,
  Settings,
  User,
  Shield,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const navItems = [
    { label: 'Dashboard', to: '/', icon: LayoutDashboard },
    { label: 'Orders', to: '/orders', icon: ShoppingCart },
    { label: 'Create Order', to: '/orders/new', icon: PlusCircle },
    { label: 'Products', to: '/products', icon: Package },
    { label: 'Inventory', to: '/inventory', icon: Boxes },
    { label: 'Customers', to: '/customers', icon: Users },
    { label: 'Event Monitoring', to: '/events', icon: Activity },
    { label: 'DB Benchmarking', to: '/performance', icon: Zap },
    { label: 'Company Settings', to: '/settings', icon: Settings },
    { label: 'Profile', to: '/profile', icon: User },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
      {/* Platform Branding */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-white text-base tracking-tight">OmniOrder</span>
          <span className="text-[10px] uppercase font-semibold text-sky-400 block -mt-1 tracking-wider">
            SaaS B2B Multi-Tenant
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 py-2">
          Operations
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {/* Super Admin Section */}
        {isSuperAdmin && (
          <div className="pt-4 mt-4 border-t border-slate-800">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-purple-400 px-3 py-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Super Admin Plane</span>
            </div>
            <NavLink
              to="/admin/tenants"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span>Tenant Control Plane</span>
            </NavLink>
          </div>
        )}
      </nav>

      {/* Tenant Context Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-sky-400">
            {user?.tenantName?.charAt(0) || 'T'}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-semibold text-white truncate">{user?.tenantName}</div>
            <div className="text-[11px] text-slate-400 truncate">ID: {user?.tenantSlug}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
