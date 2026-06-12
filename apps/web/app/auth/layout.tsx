import type { ReactNode } from 'react';
import AuthScopeLayout from '../../src/providers/AuthScopeLayout';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthScopeLayout>{children}</AuthScopeLayout>;
}
