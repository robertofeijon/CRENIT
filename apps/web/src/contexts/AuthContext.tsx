"use client";
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import api from '../lib/api';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextValue {
  user: User | null;
  role: string | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  register: (email: string, password: string, full_name: string, role: string, marketDataConsent?: boolean) => Promise<any>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [apiRole, setApiRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const payload = res.data?.data;
    const authData = payload?.data ? payload.data : payload;
    const sessionData = authData?.session;
    const userData = authData?.user;

    if (sessionData?.access_token && sessionData?.refresh_token) {
      await supabase.auth.setSession({
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
      });
      setSession(sessionData);
      setUser(userData ?? null);
      api.defaults.headers.common.Authorization = `Bearer ${sessionData.access_token}`;
      try {
        const me = await api.get('/auth/me');
        const profile = me.data?.data?.profile;
        if (profile?.role) {
          setApiRole(profile.role.toString().toUpperCase());
        }
      } catch {
        setApiRole(null);
      }
    }
    return authData;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setApiRole(null);
  };

  useEffect(() => {
    if (session?.access_token) {
      api.defaults.headers.common.Authorization = `Bearer ${session.access_token}`;
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  }, [session]);

  useEffect(() => {
    let cancelled = false;

    const loadProfileRole = async () => {
      if (!session?.access_token) {
        setApiRole(null);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        const profile = res.data?.data?.profile;
        if (!cancelled && profile?.role) {
          setApiRole(profile.role.toString().toUpperCase());
        }
      } catch {
        if (!cancelled) {
          setApiRole(null);
        }
      }
    };

    loadProfileRole();
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const register = async (email: string, password: string, full_name: string, role: string, marketDataConsent = false) => {
    const res = await api.post('/auth/register', {
      email,
      password,
      full_name,
      role,
      market_data_consent: marketDataConsent,
    });
    return res.data?.data;
  };

  const role = useMemo(() => {
    if (apiRole) {
      return apiRole;
    }
    if (!user) {
      return null;
    }
    const rawRole = (user.user_metadata as Record<string, unknown>)?.role;
    return rawRole ? rawRole.toString().toUpperCase() : null;
  }, [user, apiRole]);

  const value = useMemo(
    () => ({ user, role, session, loading, login, logout, register }),
    [user, role, session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
