import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { login as apiLogin, setAuthToken } from '../api';

export type Role = 'tenant' | 'landlord';

interface User {
  name: string;
  role: Role;
  id?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        setAuthToken(storedToken);
      } catch (e) {
        console.warn('Failed to restore auth from localStorage:', e);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const resp = await apiLogin(email, password);
    // backend returns { access_token, user: { fullName, role, ... } }
    const userData: User = {
      name: resp.user.fullName,
      role: resp.user.role,
      id: resp.user.id,
    };
    
    setToken(resp.access_token);
    setUser(userData);
    setAuthToken(resp.access_token);
    
    // Persist to localStorage
    localStorage.setItem('auth_token', resp.access_token);
    localStorage.setItem('auth_user', JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
