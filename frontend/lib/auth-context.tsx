'use client';

import { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';
import { getCurrentUser, logout as apiLogout, isLoggedIn } from '@/lib/api';
import { showGlobalSuccessToast } from '@/lib/toast-events';

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (!isLoggedIn()) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await getCurrentUser();
      setUser(response.user);
    } catch (error) {
      const status = (error as { status?: number })?.status;
      // 初回ロード時の 401 (無効トークン) は静かに未ログイン扱いにする
      if (status !== 401) {
        console.error('Failed to load user:', error);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const refresh = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        loading,
        refresh,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Redirects to the given path when unauthenticated and exposes auth loading state.
 * Optionally shows a one-shot toast message.
 */
export function useRequireAuth(
  redirectTo = '/login',
  options?: { message?: string; showToast?: boolean }
) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      if (options?.showToast !== false) {
        showGlobalSuccessToast(options?.message ?? 'ログインしてください');
      }
      router.replace(redirectTo);
    }
  }, [loading, isAuthenticated, redirectTo, router, options?.message, options?.showToast]);

  return { isAuthenticated, loading };
}
