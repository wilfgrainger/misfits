import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser } from '../../shared/api';
import { api, ApiClientError } from '../api/client';

interface AuthState {
  user: AuthUser | null;
  requiresOnboarding: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [requiresOnboarding, setRequiresOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getMe();
      setUser(response.user);
      setRequiresOnboarding(response.requiresOnboarding);
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 401 || error.code === 'SESSION_EXPIRED')) {
        setUser(null);
        setRequiresOnboarding(false);
      } else {
        setUser(null);
        setRequiresOnboarding(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setRequiresOnboarding(false);
    }
  }, []);

  const value = useMemo(
    () => ({ user, requiresOnboarding, loading, refresh, logout }),
    [user, requiresOnboarding, loading, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
