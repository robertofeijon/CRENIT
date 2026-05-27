'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../../src/lib/api';
import { useAuth } from '../../../../src/contexts/AuthContext';
import SkeletonBlocks from '../../../components/ui/SkeletonBlocks';
import ErrorStateCard from '../../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../../components/ui/EmptyStateCard';

export default function AdminKycCompliancePage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [selectedAudit, setSelectedAudit] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  useEffect(() => {
    if (!user || role !== 'ADMIN') return;
    setLoadingData(true);
    api
      .get('/admin/kyc/compliance')
      .then((res) => setData(res.data?.data))
      .catch((err: any) => setError(err?.response?.data?.message || 'Unable to load KYC compliance data.'))
      .finally(() => setLoadingData(false));
  }, [user, role]);

  const loadAudit = async (tenantId: string) => {
    try {
      const res = await api.get(`/admin/kyc/audit/${tenantId}?limit=50`);
      setSelectedAudit(res.data?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load audit trail.');
    }
  };

  const dismissFlag = async (flagId: string) => {
    try {
      await api.post(`/admin/kyc/flags/${flagId}/dismiss`, { note: 'Reviewed by compliance admin.' });
      const refreshed = await api.get('/admin/kyc/compliance');
      setData(refreshed.data?.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to dismiss quality flag.');
    }
  };

  if (loading || !user) return <p className="text-sm text-gray-500">Loading data...</p>;

  const stats = data?.stats || {};
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">KYC compliance dashboard</h1>
      {error ? <ErrorStateCard message={error} onRetry={() => router.refresh()} /> : null}
      {loadingData ? <SkeletonBlocks rows={4} /> : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total KYC Submissions', stats.total_submissions],
          ['Approved This Month', stats.approved_this_month],
          ['Rejected This Month', stats.rejected_this_month],
          ['Average Review Time (hours)', stats.average_review_time_hours],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase text-gray-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{value ?? '—'}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">KYC submissions</h2>
          <div className="space-y-3">
            {(data?.rows || []).map((row: any) => (
              <div key={row.tenant_id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="font-semibold text-gray-900">{row.tenant_name}</p>
                <p className="text-xs text-gray-600">
                  Submitted: {row.submission_date ? new Date(row.submission_date).toLocaleString() : 'N/A'} · Reviewed by:{' '}
                  {row.reviewed_by || 'Pending'} · Decision: {row.decision || 'PENDING'}
                </p>
                <p className="mt-1 text-xs text-gray-600">Time to decision: {row.time_to_decision_hours ?? '—'} hours</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {row.flags?.map((flag: any) => (
                    <button
                      key={flag.id}
                      type="button"
                      onClick={() => dismissFlag(flag.id)}
                      className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-800"
                    >
                      ⚠ {flag.flag_type} (dismiss)
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => loadAudit(row.tenant_id)}
                  className="mt-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs"
                >
                  View audit trail
                </button>
              </div>
            ))}
            {!loadingData && !data?.rows?.length ? (
              <EmptyStateCard title="No compliance rows" description="No KYC submissions currently match the compliance criteria." />
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Audit trail</h2>
          <div className="space-y-2">
            {selectedAudit.map((event) => (
              <div key={event.id} className="rounded-lg bg-gray-50 p-3 text-xs">
                <p className="font-semibold text-gray-900">{event.action}</p>
                <p className="text-gray-700">
                  {event.previous_status || 'N/A'} → {event.next_status || 'N/A'}
                </p>
                {event.reason ? <p className="text-gray-700">Reason: {event.reason}</p> : null}
                <p className="text-gray-500">{new Date(event.created_at).toLocaleString()}</p>
              </div>
            ))}
            {!selectedAudit.length ? (
              <EmptyStateCard title="No audit selected" description="Select a tenant row to view full KYC audit chronology." />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
