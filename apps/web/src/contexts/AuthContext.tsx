"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import api from '../lib/api';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextValue {
  user: User | null;
  role: string | null;
  session: Session | null;
  loading: boolean;
  roleReady: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  register: (email: string, password: string, full_name: string, role: string, marketDataConsent?: boolean) => Promise<any>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function roleFromUserMetadata(user: User | null): string | null {
  if (!user) return null;
  const raw = (user.user_metadata as Record<string, unknown>)?.role;
  return raw ? raw.toString().toUpperCase() : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [apiRole, setApiRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleReady, setRoleReady] = useState(false);
  const hydrateGeneration = useRef(0);

  const hydrateFromSession = useCallback(async (nextSession: Session | null) => {
    const generation = ++hydrateGeneration.current;

    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.access_token) {
      setApiRole(null);
      setRoleReady(true);
      setLoading(false);
      return;
    }

    api.defaults.headers.common.Authorization = `Bearer ${nextSession.access_token}`;
    setRoleReady(false);
    setLoading(true);

    try {
      const me = await api.get('/auth/me', { timeout: 12_000 });
      if (generation !== hydrateGeneration.current) return;

      const profile = me.data?.data?.profile;
      if (profile?.role) {
        setApiRole(profile.role.toString().toUpperCase());
      } else {
        setApiRole(roleFromUserMetadata(nextSession.user));
      }
    } catch {
      if (generation !== hydrateGeneration.current) return;
      setApiRole(roleFromUserMetadata(nextSession.user));
    } finally {
      if (generation === hydrateGeneration.current) {
        setRoleReady(true);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      await hydrateFromSession(initialSession);
    };

    void bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!mounted) return;
      // Initial session is handled by bootstrap() — duplicate calls caused a stuck loading state.
      if (event === 'INITIAL_SESSION') return;
      void hydrateFromSession(currentSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [hydrateFromSession]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password }, { timeout: 12_000 });
    const payload = res.data?.data;
    const authData = payload?.data ? payload.data : payload;
    const sessionData = authData?.session;
    const userData = authData?.user;

    if (sessionData?.access_token && sessionData?.refresh_token) {
      await supabase.auth.setSession({
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
      });
      await hydrateFromSession({ ...sessionData, user: userData ?? sessionData.user } as Session);
    }
    return authData;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    await hydrateFromSession(null);
  };

  const role = useMemo(() => {
    if (apiRole) return apiRole;
    return roleFromUserMetadata(user);
  }, [user, apiRole]);

  const value = useMemo(
    () => ({ user, role, session, loading, roleReady, login, logout, register }),
    [user, role, session, loading, roleReady],
  );

  async function register(
    email: string,
    password: string,
    full_name: string,
    roleValue: string,
    marketDataConsent = false,
  ) {
    const res = await api.post('/auth/register', {
      email,
      password,
      full_name,
      role: roleValue,
      market_data_consent: marketDataConsent,
    });
    return res.data?.data;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
