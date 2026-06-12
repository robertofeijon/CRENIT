'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import api from '../../../../src/lib/api';
import { useAuth } from '../../../../src/contexts/AuthContext';
import AdminPageHeader from '../../../components/ui/AdminPageHeader';
import AdminStatCard from '../../../components/ui/AdminStatCard';
import SkeletonBlocks from '../../../components/ui/SkeletonBlocks';
import ErrorStateCard from '../../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../../components/ui/EmptyStateCard';

export default function AdminKycCompliancePage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  const loadData = useCallback(() => {
    setLoadingData(true);
    setError(null);
    api
      .get('/admin/kyc/compliance')
      .then((res) => setData(res.data?.data))
      .catch((err: any) => setError(err?.response?.data?.message || 'Unable to load KYC compliance data.'))
      .finally(() => setLoadingData(false));
  }, []);

  useEffect(() => {
    if (user && role === 'ADMIN') {
      loadData();
    }
  }, [user, role, loadData]);

  const loadAudit = async (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setAuditLoading(true);
    try {
      const res = await api.get(`/admin/kyc/audit/${tenantId}?limit=50`);
      setSelectedAudit(res.data?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load audit trail.');
    } finally {
      setAuditLoading(false);
    }
  };

  const dismissFlag = async (flagId: string) => {
    setError(null);
    try {
      await api.post(`/admin/kyc/flags/${flagId}/dismiss`, { note: 'Reviewed by compliance admin.' });
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to dismiss quality flag.');
    }
  };


  const stats = data?.stats || {};

  return (
    <div className="space-y-6">
      <AdminPageHeader
        badge="KYC compliance"
        title="KYC compliance dashboard"
        subtitle="Regulatory oversight — submission throughput, review SLAs, quality flags, and per-tenant audit chronology."
        actions={
          <button
            type="button"
            onClick={loadData}
            disabled={loadingData}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A] hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loadingData ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        }
      />

      {error ? <ErrorStateCard message={error} onRetry={loadData} /> : null}

      {loadingData && !data ? (
        <SkeletonBlocks rows={4} />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <AdminStatCard label="Total submissions" value={stats.total_submissions ?? '—'} icon={ShieldCheck} />
            <AdminStatCard
              label="Approved (month)"
              value={stats.approved_this_month ?? '—'}
              accent="success"
              icon={ShieldCheck}
            />
            <AdminStatCard
              label="Rejected (month)"
              value={stats.rejected_this_month ?? '—'}
              accent="warning"
              icon={AlertTriangle}
            />
            <AdminStatCard
              label="Avg review (hrs)"
              value={stats.average_review_time_hours ?? '—'}
              sub="Submission → decision"
            />
            <AdminStatCard
              label="Open quality flags"
              value={stats.open_quality_flags ?? '—'}
              accent={(stats.open_quality_flags ?? 0) > 0 ? 'warning' : 'default'}
              icon={AlertTriangle}
            />
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-semibold text-[#1A1A1A]">Submission register</h2>
              <p className="mt-1 text-sm text-slate-500">Click a row to load the full KYC audit trail.</p>
              <div className="mt-4 space-y-3">
                {(data?.rows || []).map((row: any) => (
                  <button
                    key={row.tenant_id}
                    type="button"
                    onClick={() => void loadAudit(row.tenant_id)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selectedTenantId === row.tenant_id
                        ? 'border-[#C0392B] bg-[#FDEDEC]'
                        : 'border-slate-200 bg-[#F3F4F6] hover:border-slate-300'
                    }`}
                  >
                    <p className="font-semibold text-[#1A1A1A]">{row.tenant_name}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Submitted: {row.submission_date ? new Date(row.submission_date).toLocaleString() : '—'}
                    </p>
                    <p className="text-xs text-slate-600">
                      Reviewer: {row.reviewed_by || 'Pending'} · Decision:{' '}
                      <span className="font-medium">{row.decision || 'PENDING'}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Time to decision: {row.time_to_decision_hours ?? '—'} hours
                    </p>
                    {row.flags?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {row.flags.map((flag: any) => (
                          <span
                            key={flag.id}
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              void dismissFlag(flag.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.stopPropagation();
                                void dismissFlag(flag.id);
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-900"
                          >
                            <AlertTriangle className="h-3 w-3" aria-hidden />
                            {flag.flag_type} — dismiss
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </button>
                ))}
                {!data?.rows?.length ? (
                  <EmptyStateCard
                    title="No submissions in register"
                    description="KYC submissions with a submitted_at timestamp appear here."
                  />
                ) : null}
              </div>
            </section>

            <aside className="h-fit rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-semibold text-[#1A1A1A]">Audit trail</h2>
              {auditLoading ? (
                <p className="mt-4 text-sm text-slate-500">Loading audit events…</p>
              ) : selectedAudit.length ? (
                <ul className="mt-4 max-h-[480px] space-y-2 overflow-auto">
                  {selectedAudit.map((event) => (
                    <li key={event.id} className="rounded-lg bg-[#F3F4F6] p-3 text-xs">
                      <p className="font-semibold text-[#1A1A1A]">{event.action}</p>
                      <p className="mt-1 text-slate-600">
                        {event.previous_status || 'N/A'} → {event.next_status || 'N/A'}
                      </p>
                      {event.reason ? <p className="mt-1 text-slate-600">Reason: {event.reason}</p> : null}
                      <p className="mt-1 text-slate-400">{new Date(event.created_at).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyStateCard
                  title="No tenant selected"
                  description="Select a submission from the register to view chronology."
                />
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
