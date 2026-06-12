import type { ReactNode } from 'react';
import AuthScopeLayout from '../../src/providers/AuthScopeLayout';
import TenantLayoutClient from './TenantLayoutClient';

export default function TenantLayout({ children }: { children: ReactNode }) {
  return (
    <AuthScopeLayout>
      <TenantLayoutClient>{children}</TenantLayoutClient>
    </AuthScopeLayout>
  );
}
