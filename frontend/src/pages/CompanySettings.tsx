import React from 'react';
import { Building2, ShieldCheck, Database, Layers, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const CompanySettings: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Company & Tenant Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review tenant identity configuration and database isolation parameters
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card title="Tenant Profile">
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Company Name
                </label>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-900 font-medium">
                  {user?.tenantName}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Tenant Unique Slug (URL Discriminator)
                </label>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-brand-600">
                  {user?.tenantSlug}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Tenant Internal UUID
                </label>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-slate-700">
                  {user?.tenantId}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Subscription Tier
                  </label>
                  <Badge variant="purple" size="md">ENTERPRISE SAAS</Badge>
                </div>
                <div>
                  <label className="block font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Tenant Account Status
                  </label>
                  <Badge variant="success" size="md">ACTIVE & VERIFIED</Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div>
          <Card title="Tenant Isolation Engine" className="bg-gradient-to-b from-white to-slate-50">
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero Cross-Tenant Leakage</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Every query is automatically injected with <code className="bg-slate-100 px-1 py-0.5 rounded text-brand-600">WHERE tenant_id = ?</code> before execution.
              </p>

              <div className="pt-2 border-t border-slate-200 space-y-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
                  <span>Verified JWT Claims Resolution</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
                  <span>Unique (tenant_id, sku) Constraints</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
                  <span>Unique (tenant_id, email) Constraints</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
                  <span>Kafka Message Keyed by tenant_id</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
