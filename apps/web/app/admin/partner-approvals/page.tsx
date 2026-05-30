'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import AdminPageHeader from '../../components/ui/AdminPageHeader';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';
import DocumentInlinePreview from '../../components/kyc/DocumentInlinePreview';

export default function AdminPartnerApprovalsPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    if (!silent) setError(null);
    try {
      const res = await api.get('/admin/partner-approvals');
      setRows(res.data?.data?.rows || []);
    } catch (err: any) {
      if (!silent) {
        setError(err?.response?.data?.message || err?.message || 'Unable to load partner submissions.');
        setRows([]);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && role === 'ADMIN') {
      void load();
    }
  }, [user, role, load]);

  useEffect(() => {
    if (!user || role !== 'ADMIN') return;
    const interval = setInterval(() => void load(true), 5000);
    return () => clearInterval(interval);
  }, [user, role, load]);

  const review = async (action: 'APPROVE' | 'REJECT') => {
    if (!selected) return;
    if (action === 'REJECT' && !reason.trim()) {
      setError('A rejection reason is required.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await api.post(`/admin/partner-approvals/${selected.id}/review`, {
        action,
        reason: reason.trim() || undefined,
      });
      setMessage(action === 'APPROVE' ? 'Landlord partner approved. Email sent.' : 'Submission rejected. Landlord notified by email.');
      setSelected(null);
      setReason('');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to save review.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !user || role !== 'ADMIN') {
    return <p className="text-sm text-slate-500">Loading admin workspace...</p>;
  }

  const pendingCount = rows.filter((r) => r.status === 'PENDING_APPROVAL').length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        badge="Partners"
        title="Landlord partner approvals"
        subtitle="Review onboarding submissions — identity, ownership docs, and portfolio intent."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A] transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        }
      />

      <p className="text-sm text-slate-600">
        <strong>{pendingCount}</strong> pending · <strong>{rows.length}</strong> total submissions
      </p>

      {error ? <ErrorStateCard message={error} onRetry={load} /> : null}
      {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          {isLoading ? (
            <SkeletonBlocks rows={3} />
          ) : rows.length ? (
            rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelected(row)}
                className={`w-full rounded-[1.5rem] border p-5 text-left shadow-sm transition ${
                  selected?.id === row.id
                    ? 'border-[#C0392B] bg-[#FDEDEC]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-[#C0392B]" aria-hidden />
                    <p className="font-semibold text-[#1A1A1A]">{row.landlord_name}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${
                      row.status === 'PENDING_APPROVAL'
                        ? 'bg-amber-100 text-amber-900'
                        : row.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {row.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {row.business_name || '—'} · {row.properties_intended} properties · {row.tenants_estimated}{' '}
                  tenants est.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Submitted {new Date(row.submitted_at).toLocaleString()}
                </p>
              </button>
            ))
          ) : (
            <EmptyStateCard
              title="No partner submissions"
              description="Landlord onboarding forms appear here when submitted for review."
            />
          )}
        </div>

        <aside className="h-fit rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Review panel</h2>
          {!selected ? (
            <p className="mt-4 text-sm text-slate-500">Select a submission to approve or reject.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-[#F3F4F6] p-4 text-sm">
                <p className="font-semibold text-[#1A1A1A]">{selected.full_legal_name}</p>
                <p className="mt-1 text-slate-600">Reg: {selected.registration_number}</p>
                <p className="text-slate-600">Phone: {selected.phone_number}</p>
                <p className="text-slate-600">Profile status: {selected.current_status}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Identity document</p>
                  {selected.id_document_path ? (
                    <DocumentInlinePreview url={selected.id_document_path} fileName="identity" />
                  ) : (
                    <p className="text-sm text-slate-500">Not uploaded</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Ownership document</p>
                  {selected.ownership_document_path ? (
                    <DocumentInlinePreview url={selected.ownership_document_path} fileName="ownership" />
                  ) : (
                    <p className="text-sm text-slate-500">Not uploaded</p>
                  )}
                </div>
              </div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Rejection reason (required if rejecting)"
                className="min-h-[100px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#C0392B]/60"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void review('APPROVE')}
                  disabled={actionLoading || selected.status !== 'PENDING_APPROVAL'}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => void review('REJECT')}
                  disabled={actionLoading || selected.status !== 'PENDING_APPROVAL'}
                  className="inline-flex items-center gap-2 rounded-full bg-[#C0392B] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <XCircle className="h-4 w-4" aria-hidden />
                  Reject
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
