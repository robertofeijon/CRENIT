'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, RefreshCw, ScrollText } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import AdminPageHeader from '../../components/ui/AdminPageHeader';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';

const PAGE_SIZE = 25;

export default function AdminAuditPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  const loadAudit = useCallback(() => {
    if (!user || role !== 'ADMIN') return;
    setIsLoading(true);
    setError(null);
    api
      .get(`/admin/audit-log?page=${page}&limit=${PAGE_SIZE}`)
      .then((res) => {
        const payload = res.data.data;
        setLogs(payload.logs || []);
        setTotal(payload.total ?? 0);
        setTotalPages(Math.max(1, payload.total_pages ?? 1));
      })
      .catch((err: any) => setError(err?.response?.data?.message || err?.message || 'Unable to load audit log.'))
      .finally(() => setIsLoading(false));
  }, [user, role, page]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  const actionOptions = useMemo(() => {
    const actions = new Set(logs.map((l) => l.action).filter(Boolean));
    return Array.from(actions).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (!actionFilter) return logs;
    return logs.filter((l) => l.action === actionFilter);
  }, [logs, actionFilter]);

  if (loading || !user || role !== 'ADMIN') {
    return <p className="text-sm text-slate-500">Loading admin workspace...</p>;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        badge="Compliance"
        title="Audit log"
        subtitle="Immutable record of admin actions — partner decisions, KYC, suspensions, and arbitration."
        actions={
          <button
            type="button"
            onClick={loadAudit}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A] transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-sm font-medium text-slate-700" htmlFor="audit-action-filter">
          Filter by action
        </label>
        <select
          id="audit-action-filter"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-[#F3F4F6] px-3 py-2 text-sm text-[#1A1A1A]"
        >
          <option value="">All actions on this page</option>
          {actionOptions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
        <p className="ml-auto text-xs text-slate-500">
          {total.toLocaleString()} total entries · page {page} of {totalPages}
        </p>
      </div>

      {error ? <ErrorStateCard message={error} onRetry={loadAudit} /> : null}

      {isLoading ? (
        <SkeletonBlocks rows={5} />
      ) : filteredLogs.length ? (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <article
              key={log.id}
              className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-[#C0392B]" aria-hidden />
                  <p className="font-semibold text-[#1A1A1A]">{log.action}</p>
                </div>
                <time className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</time>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-medium text-slate-800">Admin:</span> {log.admin_name || log.admin_id}
                <span className="mx-2 text-slate-300">→</span>
                <span className="font-medium text-slate-800">Target:</span> {log.target_name || log.target_user_id || '—'}
              </p>
              {log.details && Object.keys(log.details).length > 0 ? (
                <pre className="mt-3 overflow-x-auto rounded-xl bg-[#F3F4F6] p-3 text-xs text-slate-700">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <EmptyStateCard
          title="No audit entries"
          description={actionFilter ? 'No entries match this filter on the current page.' : 'Admin actions will appear here once recorded.'}
        />
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A] disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || isLoading}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A] disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
