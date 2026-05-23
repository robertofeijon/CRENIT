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
  const [message, setMessage] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [suspendReason, setSuspendReason] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/users', {
        params: { limit: 30, role: roleFilter || undefined, search: search || undefined },
      });
      setUsers(res.data.data.users || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && role === 'ADMIN') loadUsers();
  }, [user, role]);

  const handleSuspend = async (userId: string, suspended: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.put(`/admin/users/${userId}/suspend`, {
        suspended,
        reason: suspendReason[userId] || (suspended ? 'Policy violation' : null),
      });
      setMessage(suspended ? 'User suspended.' : 'User reactivated.');
      await loadUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to update user.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-bold text-slate-900">User management</h1>
      <p className="mt-3 text-sm text-slate-600">Search users, filter by role, and manage account status.</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name" className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm">
          <option value="">All roles</option>
          <option value="TENANT">Tenant</option>
          <option value="LANDLORD">Landlord</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button onClick={loadUsers} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
          Search
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-600">Loading users...</p>
      ) : users.length ? (
        <div className="mt-6 space-y-4">
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
              <p className="mt-3 text-sm text-slate-600">KYC: {person.kyc_status} · Suspended: {person.is_suspended ? 'Yes' : 'No'}</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={suspendReason[person.id] || ''}
                  onChange={(e) => setSuspendReason((prev) => ({ ...prev, [person.id]: e.target.value }))}
                  placeholder="Suspension reason (optional)"
                  className="flex-1 rounded-2xl border border-slate-300 px-4 py-2 text-sm"
                />
                {person.is_suspended ? (
                  <button onClick={() => handleSuspend(person.id, false)} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                    Reactivate
                  </button>
                ) : (
                  <button onClick={() => handleSuspend(person.id, true)} className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">
                    Suspend
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-500">No users found.</p>
      )}
    </div>
  );
}
