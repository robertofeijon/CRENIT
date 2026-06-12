'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '../contexts/AuthContext';

/** Wraps authenticated app segments only — marketing routes stay outside AuthProvider. */
export default function AuthScopeLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
