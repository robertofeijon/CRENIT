'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Search, UserX, UserCheck, Flag } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import AdminPageHeader from '../../components/ui/AdminPageHeader';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';

type PlatformUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  kyc_status: string;
  is_suspended: boolean;
  suspension_reason: string | null;
  account_flagged?: boolean;
  account_flag_note?: string | null;
  created_at: string | null;
  has_profile?: boolean;
};

export default function AdminUsersPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [suspendReason, setSuspendReason] = useState<Record<string, string>>({});
  const [flagNote, setFlagNote] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/users', {
        params: {
          limit: 100,
          role: roleFilter || undefined,
          search: search.trim() || undefined,
        },
      });
      setUsers(res.data.data.users || []);
      setTotal(res.data.data.total ?? res.data.data.users?.length ?? 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load users.');
    } finally {
      setIsLoading(false);
    }
  }, [roleFilter, search]);

  useEffect(() => {
    if (user && role === 'ADMIN') {
      void loadUsers();
    }
  }, [user, role, loadUsers]);

  const handleFlag = async (userId: string, flagged: boolean) => {
    setError(null);
    try {
      await api.put(`/admin/users/${userId}/flag`, {
        flagged,
        note: flagNote[userId] || (flagged ? 'Flagged for admin review' : null),
      });
      setMessage(flagged ? 'Account flagged.' : 'Flag removed.');
      await loadUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to update flag.');
    }
  };

  const handleSuspend = async (userId: string, suspended: boolean) => {
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
    }
  };

  const roleBadgeClass = (userRole: string) => {
    if (userRole === 'ADMIN') return 'bg-[#1A1A1A] text-white';
    if (userRole === 'LANDLORD') return 'bg-[#FDEDEC] text-[#C0392B]';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        badge="User management"
        title="All platform users"
        subtitle="Lists every auth account plus profiles from Supabase. Users without a profile row are marked — they appear after their first login."
        actions={
          <button
            type="button"
            onClick={() => void loadUsers()}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A] transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Refresh
          </button>
        }
      />

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void loadUsers();
                }}
                placeholder="Name or email"
                className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#C0392B]/60"
              />
            </div>
          </div>
          <div className="w-full lg:w-48">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#C0392B]/60"
            >
              <option value="">All roles</option>
              <option value="TENANT">Tenant</option>
              <option value="LANDLORD">Landlord</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => void loadUsers()}
            className="inline-flex items-center justify-center rounded-full bg-[#C0392B] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-[#C0392B]/20 transition hover:bg-[#992d24]"
          >
            Search users
          </button>
        </div>

        <p className="mt-4 text-sm text-slate-600">
          Showing <strong>{users.length}</strong> of <strong>{total}</strong> matching users
        </p>
      </div>

      {error ? <ErrorStateCard message={error} onRetry={loadUsers} /> : null}
      {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}

      {isLoading ? (
        <SkeletonBlocks rows={4} />
      ) : users.length ? (
        <div className="space-y-4">
          {users.map((person) => (
            <article
              key={person.id}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-[#1A1A1A]">{person.full_name || 'Unnamed user'}</p>
                  <p className="mt-1 text-sm text-slate-600">{person.email}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    Joined {person.created_at ? new Date(person.created_at).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${roleBadgeClass(person.role)}`}>
                    {person.role}
                  </span>
                  {person.has_profile === false ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                      No profile yet
                    </span>
                  ) : null}
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      person.is_suspended ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {person.is_suspended ? 'Suspended' : 'Active'}
                  </span>
                  {person.account_flagged ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                      Flagged
                    </span>
                  ) : null}
                </div>
              </div>

              <p className="mt-4 text-sm text-slate-600">
                KYC: <span className="font-medium">{person.kyc_status}</span>
                {person.suspension_reason ? ` · Suspend reason: ${person.suspension_reason}` : ''}
                {person.account_flag_note ? ` · Flag: ${person.account_flag_note}` : ''}
              </p>

              {person.has_profile === false ? (
                <p className="mt-4 text-sm text-amber-800">
                  This account exists in auth but has no profile row yet. Suspend/reactivate is available after they sign in once.
                </p>
              ) : (
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={flagNote[person.id] || ''}
                    onChange={(e) => setFlagNote((prev) => ({ ...prev, [person.id]: e.target.value }))}
                    placeholder="Flag note (optional)"
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#C0392B]/60"
                  />
                  {person.account_flagged ? (
                    <button
                      type="button"
                      onClick={() => void handleFlag(person.id, false)}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-900"
                    >
                      Clear flag
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleFlag(person.id, true)}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-400 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900"
                    >
                      <Flag className="h-4 w-4" aria-hidden />
                      Flag account
                    </button>
                  )}
                </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={suspendReason[person.id] || ''}
                  onChange={(e) => setSuspendReason((prev) => ({ ...prev, [person.id]: e.target.value }))}
                  placeholder="Suspension reason (optional)"
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#C0392B]/60"
                />
                {person.is_suspended ? (
                  <button
                    type="button"
                    onClick={() => void handleSuspend(person.id, false)}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <UserCheck className="h-4 w-4" aria-hidden />
                    Reactivate
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleSuspend(person.id, true)}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C0392B] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <UserX className="h-4 w-4" aria-hidden />
                    Suspend
                  </button>
                )}
              </div>
              </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyStateCard
          title="No users found"
          description="Try clearing filters or run npm run seed:demo to create demo accounts."
        />
      )}
    </div>
  );
}
