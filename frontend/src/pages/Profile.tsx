import React from 'react';
import { User as UserIcon, Mail, Shield, Building2, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const Profile: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">User Account Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          Authenticated credentials and role-based permissions in this tenant context
        </p>
      </div>

      <Card>
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 text-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-brand-500/20">
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {user?.firstName} {user?.lastName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="info" size="sm">
                {user?.role?.replace('_', ' ')}
              </Badge>
              <span className="text-xs text-slate-400">Tenant: {user?.tenantName}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{user?.email}</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Assigned Role
              </label>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-400" />
                <span className="font-semibold">{user?.role}</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Tenant Organization
              </label>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span>{user?.tenantName} ({user?.tenantSlug})</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Authentication Model
              </label>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-400" />
                <span>HMAC-SHA256 Signed JWT</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
