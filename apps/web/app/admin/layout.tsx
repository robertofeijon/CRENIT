import type { ReactNode } from 'react';
import AuthScopeLayout from '../../src/providers/AuthScopeLayout';
import AdminLayoutClient from './AdminLayoutClient';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthScopeLayout>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </AuthScopeLayout>
  );
}
