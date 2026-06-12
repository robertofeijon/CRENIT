'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, RefreshCw, Search, Shield, Trash2, Users } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import AdminPageHeader from '../../components/ui/AdminPageHeader';
import AdminStatCard from '../../components/ui/AdminStatCard';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';

type ComplianceUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  has_profile?: boolean;
};

export default function AdminCompliancePage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<ComplianceUser[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteInputByUser, setDeleteInputByUser] = useState<Record<string, string>>({});
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  const fetchUsers = useCallback(async (q: string) => {
    setLoadingRows(true);
    setError(null);
    try {
      const res = await api.get('/admin/compliance/search-users', { params: { q: q.trim(), limit: 25 } });
      setRows(res.data?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to search users.');
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  }, []);

  const searchUsers = useCallback(() => void fetchUsers(query), [fetchUsers, query]);

  useEffect(() => {
    if (user && role === 'ADMIN') {
      void fetchUsers('');
    }
  }, [user, role, fetchUsers]);

  const exportData = async (userId: string) => {
    setBusyUserId(userId);
    setError(null);
    try {
      const res = await api.post(`/admin/compliance/${userId}/export`);
      const payload = JSON.stringify(res.data?.data || {}, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `crenit-gdpr-export-${userId.slice(0, 8)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage('Subject access export downloaded (JSON).');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to export user data.');
    } finally {
      setBusyUserId(null);
    }
  };

  const deleteAccount = async (target: ComplianceUser) => {
    const typed = deleteInputByUser[target.id] || '';
    if (typed !== target.full_name) {
      setError('Type the exact full name to confirm anonymisation.');
      return;
    }
    setBusyUserId(target.id);
    setError(null);
    try {
      await api.post(`/admin/compliance/${target.id}/delete`, {
        confirmation_text: typed,
        expected_name: target.full_name,
      });
      setMessage('Account anonymised and GDPR deletion logged.');
      setDeleteInputByUser((prev) => ({ ...prev, [target.id]: '' }));
      await searchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to anonymise account.');
    } finally {
      setBusyUserId(null);
    }
  };


  return (
    <div className="space-y-6">
      <AdminPageHeader
        badge="Privacy & compliance"
        title="GDPR & data subject requests"
        subtitle="Search users, export portable data packages, or anonymise accounts after verified deletion requests. All actions are audit-logged."
        actions={
          <button
            type="button"
            onClick={() => void searchUsers()}
            disabled={loadingRows}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A] hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loadingRows ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        }
      />

      <div className="rounded-[1.5rem] border border-slate-200 bg-[#F3F4F6] p-5">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[#C0392B]" aria-hidden />
          <div className="text-sm text-slate-600">
            <p className="font-semibold text-[#1A1A1A]">Before you export or delete</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-5">
              <li>Export produces a JSON bundle: profile, payments, KYC metadata, scores, deposits, admin audit references.</li>
              <li>Delete anonymises the profile and removes KYC files from storage — irreversible.</li>
              <li>Confirm identity of the requester outside the platform before acting.</li>
            </ul>
          </div>
        </div>
      </div>

      {error ? <ErrorStateCard message={error} onRetry={searchUsers} /> : null}
      {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <AdminStatCard label="Search results" value={rows.length} sub="Current page (max 25)" icon={Users} />
        <AdminStatCard
          label="Profiles in results"
          value={rows.filter((r) => r.has_profile !== false).length}
          sub="With public.profiles row"
          icon={Shield}
        />
        <AdminStatCard
          label="Auth-only users"
          value={rows.filter((r) => r.has_profile === false).length}
          sub="In auth but no profile row"
          icon={Users}
          accent={rows.some((r) => r.has_profile === false) ? 'warning' : 'default'}
        />
      </section>

      <p className="text-sm text-slate-600">
        Related:{' '}
        <Link href="/admin/audit" className="font-semibold text-[#C0392B] hover:underline">
          Audit log →
        </Link>
        {' · '}
        <Link href="/admin/kyc/compliance" className="font-semibold text-[#C0392B] hover:underline">
          KYC compliance
        </Link>
      </p>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Find user</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void searchUsers();
              }}
              placeholder="Name or email"
              className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-[#C0392B]/60"
            />
          </div>
          <button
            type="button"
            onClick={() => void searchUsers()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C0392B] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-[#C0392B]/20"
          >
            <Search className="h-4 w-4" aria-hidden />
            Search
          </button>
        </div>
      </div>

      {loadingRows ? (
        <SkeletonBlocks rows={3} />
      ) : rows.length ? (
        <div className="space-y-4">
          {rows.map((row) => (
            <article key={row.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-[#1A1A1A]">{row.full_name}</p>
                  <p className="mt-1 text-sm text-slate-600">{row.email}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {row.role}
                    {row.has_profile === false ? ' · No profile row' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyUserId === row.id}
                  onClick={() => void exportData(row.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A] hover:bg-slate-50 disabled:opacity-60"
                >
                  <Download className="h-4 w-4" aria-hidden />
                  Export data
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-800">Right to erasure</p>
                <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-center">
                  <input
                    value={deleteInputByUser[row.id] || ''}
                    onChange={(e) => setDeleteInputByUser((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    placeholder={`Type "${row.full_name}" to confirm`}
                    className="flex-1 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400"
                  />
                  <button
                    type="button"
                    disabled={busyUserId === row.id}
                    onClick={() => void deleteAccount(row)}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C0392B] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Anonymise account
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyStateCard
          title="No users match"
          description="Search by name or email. Users from auth without profiles may still appear after listUsers merge."
        />
      )}
    </div>
  );
}
