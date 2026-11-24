import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layers, ArrowRight, ShieldCheck, AlertCircle, Building2, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, quickDemoLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({
        email,
        password,
        tenantSlug: tenantSlug.trim() || undefined,
      });
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemo = async (type: 'ABC_ADMIN' | 'ABC_STAFF' | 'XYZ_ADMIN' | 'XYZ_STAFF' | 'SUPER_ADMIN') => {
    setError(null);
    setIsLoading(true);
    try {
      await quickDemoLogin(type);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 text-white shadow-xl shadow-brand-500/20 mb-4">
          <Layers className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">OmniOrder SaaS</h2>
        <p className="mt-2 text-sm text-slate-400">
          Multi-Tenant B2B Order Management with Apache Kafka
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@abcelectronics.com"
                className="mt-1 block w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="mt-1 block w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Company Slug (Optional)
                </label>
                <span className="text-[11px] text-slate-400">e.g. abc-electronics</span>
              </div>
              <input
                type="text"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="abc-electronics"
                className="mt-1 block w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials Presets */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>One-Click University Demo Logins</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemo('ABC_ADMIN')}
                className="p-2.5 text-left border border-slate-200 rounded-lg hover:border-brand-500 hover:bg-brand-50/50 transition-colors"
              >
                <div className="font-semibold text-slate-800 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-brand-600" /> ABC Electronics
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Role: Tenant Admin</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemo('XYZ_ADMIN')}
                className="p-2.5 text-left border border-slate-200 rounded-lg hover:border-brand-500 hover:bg-brand-50/50 transition-colors"
              >
                <div className="font-semibold text-slate-800 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-purple-600" /> XYZ Fashion
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Role: Tenant Admin</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemo('ABC_STAFF')}
                className="p-2.5 text-left border border-slate-200 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors"
              >
                <div className="font-semibold text-slate-700 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-500" /> ABC Staff
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Role: Staff Member</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemo('SUPER_ADMIN')}
                className="p-2.5 text-left border border-purple-200 bg-purple-50/40 rounded-lg hover:border-purple-500 transition-colors"
              >
                <div className="font-semibold text-purple-900 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-purple-600" /> Super Admin
                </div>
                <div className="text-[10px] text-purple-600 mt-0.5">Platform Controller</div>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Need to register a new tenant company?{' '}
            <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-500">
              Register Company
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
