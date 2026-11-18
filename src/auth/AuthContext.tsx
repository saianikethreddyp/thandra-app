import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, ApiError } from '@/api';
import type { LoginResult, User } from '@/api/types';
import { toApiPhone } from '@/utils/phone';

type Status = 'loading' | 'signedOut' | 'signedIn';
export type Intent = 'login' | 'signup';

type AuthValue = {
  status: Status;
  user: User | null;
  requestOtp: (phone: string, intent: Intent) => Promise<void>;
  verifyOtp: (phone: string, intent: Intent, code: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-reads the customer, e.g. after contacts were synced. */
  reloadUser: () => Promise<void>;
  /** Set when the server could not be reached while restoring the session. */
  offline: boolean;
  retryRestore: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [offline, setOffline] = useState(false);

  const restore = useCallback(async () => {
    setStatus('loading');
    setOffline(false);
    const outcome = await api.refresh();
    if (outcome === 'ok') {
      try {
        setUser(await api.request<User>('/v1/customer/me'));
        setStatus('signedIn');
        return;
      } catch (e) {
        if (e instanceof ApiError && e.isNetwork) setOffline(true);
      }
    } else if (outcome === 'network') {
      setOffline(true);
    }
    setUser(null);
    setStatus('signedOut');
  }, []);

  useEffect(() => {
    api.setSessionExpiredHandler(() => {
      setUser(null);
      setStatus('signedOut');
    });
    restore();
    return () => api.setSessionExpiredHandler(null);
  }, [restore]);

  const requestOtp = useCallback(async (phone: string, intent: Intent) => {
    await api.request('/v1/customer/auth/otp/request', { method: 'POST', body: { phone: toApiPhone(phone), intent }, auth: false });
  }, []);

  const verifyOtp = useCallback(async (phone: string, intent: Intent, code: string, name?: string) => {
    const res = await api.request<LoginResult>('/v1/customer/auth/otp/verify', {
      method: 'POST',
      body: { phone: toApiPhone(phone), intent, code, ...(intent === 'signup' ? { name: name?.trim() } : {}) },
      auth: false,
    });
    await api.setTokens(res.tokens);
    setUser(res.user);
    setStatus('signedIn');
  }, []);

  const logout = useCallback(async () => {
    try {
      const rt = await api.getRefreshToken();
      if (rt) await api.request('/v1/customer/auth/logout', { method: 'POST', body: { refresh_token: rt }, auth: false });
    } catch {
      // Signing out on this phone is what matters; the server session expires on its own.
    }
    await api.clearSession();
    setUser(null);
    setStatus('signedOut');
  }, []);

  const reloadUser = useCallback(async () => {
    try {
      setUser(await api.request<User>('/v1/customer/me'));
    } catch {
      // Keep the current user; the next request will surface a real problem.
    }
  }, []);

  const value = useMemo(
    () => ({ status, user, requestOtp, verifyOtp, logout, reloadUser, offline, retryRestore: restore }),
    [status, user, requestOtp, verifyOtp, logout, reloadUser, offline, restore],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
