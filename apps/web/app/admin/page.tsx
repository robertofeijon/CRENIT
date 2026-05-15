"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';

export default function AdminPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
      return;
    }
    if (!loading && user && role !== 'ADMIN') {
      router.replace('/auth');
    }
  }, [loading, user, role, router]);

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Admin console</h1>
        <p className="mt-3 text-sm text-slate-600">Use the left menu to review KYC submissions and manage users.</p>
      </div>
    </main>
  );
}
