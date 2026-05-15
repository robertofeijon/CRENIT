"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function TenantSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
    }
  }, [loading, user, router]);

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="mt-3 text-sm text-slate-600">Manage your profile, payment accounts, security, and KYC details.</p>
        <div className="mt-8 rounded-3xl bg-slate-50 p-6 text-slate-600">
          <p className="font-semibold text-slate-900">Coming soon</p>
          <p className="mt-2 text-sm">This section will support profile management and security settings.</p>
        </div>
      </div>
    </main>
  );
}
