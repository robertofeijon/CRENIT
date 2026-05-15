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
  register: (email: string, password: string, full_name: string, role: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
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
    }
    return authData;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  useEffect(() => {
    if (session?.access_token) {
      api.defaults.headers.common.Authorization = `Bearer ${session.access_token}`;
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  }, [session]);

  const register = async (email: string, password: string, full_name: string, role: string) => {
    const res = await api.post('/auth/register', { email, password, full_name, role });
    return res.data?.data;
  };

  const role = useMemo(() => {
    if (!user) {
      return null;
    }
    const rawRole = (user.user_metadata as any)?.role;
    return rawRole ? rawRole.toString().toUpperCase() : null;
  }, [user]);

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
