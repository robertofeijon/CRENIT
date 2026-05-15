"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function AdminUsersPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
      return;
    }
    if (!loading && user && role !== 'ADMIN') {
      router.replace('/auth');
      return;
    }
  }, [loading, user, role, router]);

  useEffect(() => {
    if (user && role === 'ADMIN') {
      loadUsers();
    }
  }, [user, role]);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/users?limit=20');
      setUsers(res.data.data.users || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">User management</h1>
          <p className="mt-3 text-sm text-slate-600">Review users, filter by role, and manage account status.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {isLoading ? (
            <p className="text-sm text-slate-600">Loading users...</p>
          ) : users.length ? (
            <div className="space-y-4">
              {users.map((person) => (
                <div key={person.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{person.full_name}</p>
                      <p className="text-sm text-slate-600">{person.email}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
                      {person.role}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">KYC status: {person.kyc_status}</p>
                  <p className="mt-1 text-sm text-slate-600">Suspended: {person.is_suspended ? 'Yes' : 'No'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No users found.</p>
          )}
        </div>
      </div>
    </main>
  );
}
