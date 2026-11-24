import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'STAFF';
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  activeTenantId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string; tenantSlug?: string }) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  switchTenant: (tenantId: string) => void;
  quickDemoLogin: (type: 'ABC_ADMIN' | 'ABC_STAFF' | 'XYZ_ADMIN' | 'XYZ_STAFF' | 'SUPER_ADMIN') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('omni_token'));
  const [activeTenantId, setActiveTenantId] = useState<string | null>(
    localStorage.getItem('omni_active_tenant_id')
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('omni_token');
      const storedUser = localStorage.getItem('omni_user');

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        } catch (e) {
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: { email: string; password: string; tenantSlug?: string }) => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', credentials);
    const { token: receivedToken, user: receivedUser } = res.data;

    setToken(receivedToken);
    setUser(receivedUser);
    setActiveTenantId(receivedUser.tenantId);

    localStorage.setItem('omni_token', receivedToken);
    localStorage.setItem('omni_user', JSON.stringify(receivedUser));
    localStorage.setItem('omni_active_tenant_id', receivedUser.tenantId);
  };

  const register = async (data: any) => {
    const res = await api.post<{ token: string; user: User }>('/auth/register', data);
    const { token: receivedToken, user: receivedUser } = res.data;

    setToken(receivedToken);
    setUser(receivedUser);
    setActiveTenantId(receivedUser.tenantId);

    localStorage.setItem('omni_token', receivedToken);
    localStorage.setItem('omni_user', JSON.stringify(receivedUser));
    localStorage.setItem('omni_active_tenant_id', receivedUser.tenantId);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setActiveTenantId(null);
    localStorage.removeItem('omni_token');
    localStorage.removeItem('omni_user');
    localStorage.removeItem('omni_active_tenant_id');
  };

  const switchTenant = (tenantId: string) => {
    setActiveTenantId(tenantId);
    localStorage.setItem('omni_active_tenant_id', tenantId);
  };

  const quickDemoLogin = async (type: 'ABC_ADMIN' | 'ABC_STAFF' | 'XYZ_ADMIN' | 'XYZ_STAFF' | 'SUPER_ADMIN') => {
    const creds = {
      ABC_ADMIN: { email: 'admin@abcelectronics.com', password: 'TenantAdmin123!', tenantSlug: 'abc-electronics' },
      ABC_STAFF: { email: 'staff@abcelectronics.com', password: 'StaffPass123!', tenantSlug: 'abc-electronics' },
      XYZ_ADMIN: { email: 'admin@xyzfashion.com', password: 'TenantAdmin123!', tenantSlug: 'xyz-fashion' },
      XYZ_STAFF: { email: 'staff@xyzfashion.com', password: 'StaffPass123!', tenantSlug: 'xyz-fashion' },
      SUPER_ADMIN: { email: 'superadmin@saasplatform.com', password: 'SuperAdmin123!' },
    }[type];

    await login(creds);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeTenantId,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        switchTenant,
        quickDemoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
