import React, { createContext, useContext, useState, ReactNode } from 'react';
import { login as apiLogin, setAuthToken } from '../api';

export type Role = 'tenant' | 'landlord';

interface User {
  name: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    const resp = await apiLogin(email, password);
    // backend returns { access_token, user: { fullName, role, ... } }
    setToken(resp.access_token);
    setUser({ name: resp.user.fullName, role: resp.user.role });
    setAuthToken(resp.access_token);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
