'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gavel, RefreshCw, Scale } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import AdminPageHeader from '../../components/ui/AdminPageHeader';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';
import AdminStatCard from '../../components/ui/AdminStatCard';
import AdminHealthPanel from '../../components/admin/AdminHealthPanel';
import AdminToolbarButton from '../../components/admin/AdminToolbarButton';

export default function AdminDisputesPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [decision, setDecision] = useState<'tenant_wins' | 'landlord_wins' | 'split'>('split');
  const [amountToTenant, setAmountToTenant] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  const loadDisputes = useCallback(() => {
    setIsLoading(true);
    setError(null);
    api
      .get('/admin/disputes/pending')
      .then((res) => setDisputes(res.data.data.disputes || []))
      .catch((err: any) => setError(err?.response?.data?.message || err?.message || 'Unable to load disputes.'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (user && role === 'ADMIN') {
      loadDisputes();
      api
        .get('/admin/disputes/analytics')
        .then((res) => setAnalytics(res.data.data))
        .catch(() => setAnalytics(null));
    }
  }, [user, role, loadDisputes]);

  const selected = disputes.find((d) => d.id === selectedId);

  const handleArbitrate = async () => {
    if (!selectedId || !reason.trim() || amountToTenant === '') {
      setError('Select a dispute, enter amount to tenant, and provide a reason.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await api.post(`/admin/disputes/${selectedId}/arbitrate`, {
        decision,
        amount_to_tenant: Number(amountToTenant),
        reason: reason.trim(),
      });
      setMessage('Arbitration recorded.');
      setReason('');
      setAmountToTenant('');
      setSelectedId('');
      loadDisputes();
      api
        .get('/admin/disputes/analytics')
        .then((res) => setAnalytics(res.data.data))
        .catch(() => null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to arbitrate.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="space-y-6">
      <AdminPageHeader
        badge="Escrow"
        title="Deposit disputes"
        subtitle="Open escrow disputes awaiting admin arbitration — record split or winner decisions."
        actions={
          <AdminToolbarButton onClick={() => loadDisputes()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </AdminToolbarButton>
        }
      />

      {error ? <ErrorStateCard message={error} onRetry={loadDisputes} /> : null}
      {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}

      {analytics ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard label="Resolved (90d)" value={analytics.total_resolved ?? 0} icon={Scale} />
          <AdminStatCard label="Median days" value={analytics.median_resolution_days ?? 0} />
          <AdminStatCard label="Avg days" value={analytics.avg_resolution_days ?? 0} />
          <AdminStatCard
            label="Landlord favoured %"
            value={`${analytics.landlord_favoured_rate ?? 0}%`}
            accent="dark"
          />
        </section>
      ) : null}

      {analytics?.by_outcome && Object.keys(analytics.by_outcome).length ? (
        <AdminHealthPanel title="Outcomes (90 days)" subtitle="Arbitration results in the last quarter">
          <div className="flex flex-wrap gap-3">
            {Object.entries(analytics.by_outcome).map(([outcome, count]) => (
              <span key={outcome} className="rounded-full bg-[var(--rc-card-alt)] px-4 py-2 text-sm font-medium text-[var(--rc-text)]">
                {outcome.replace(/_/g, ' ')}: {count as number}
              </span>
            ))}
          </div>
        </AdminHealthPanel>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          {isLoading && !disputes.length ? (
            <SkeletonBlocks rows={3} />
          ) : disputes.length ? (
            disputes.map((dispute) => (
              <button
                key={dispute.id}
                type="button"
                onClick={() => setSelectedId(dispute.id)}
                className={`w-full admin-list-item text-left ${selectedId === dispute.id ? 'admin-list-item--selected' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-[#1A1A1A]">{dispute.id.slice(0, 8)}…</p>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold uppercase text-amber-900">
                    {dispute.status}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{dispute.claim_description || 'No description'}</p>
                {dispute.deposit_amount != null ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Deposit: N${Number(dispute.deposit_amount).toLocaleString()}
                  </p>
                ) : null}
              </button>
            ))
          ) : (
            <EmptyStateCard
              title="No open disputes"
              description="All escrow disputes are resolved. New disputes appear when tenants or landlords file claims."
            />
          )}
        </div>

        <aside className="admin-panel h-fit">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-[#C0392B]" aria-hidden />
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Arbitration panel</h2>
          </div>
          {!selected ? (
            <p className="mt-4 text-sm text-slate-500">Select a dispute from the list to record a decision.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-slate-600">{selected.claim_description}</p>
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value as typeof decision)}
                className="admin-select"
              >
                <option value="tenant_wins">Tenant wins</option>
                <option value="landlord_wins">Landlord wins</option>
                <option value="split">Split</option>
              </select>
              <input
                value={amountToTenant}
                onChange={(e) => setAmountToTenant(e.target.value)}
                placeholder="Amount to tenant (N$)"
                type="number"
                min={0}
                className="admin-select"
              />
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Arbitration reason (required)"
                rows={3}
                className="admin-select"
              />
              <button
                type="button"
                onClick={() => void handleArbitrate()}
                disabled={isLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#C0392B] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-[#C0392B]/20 disabled:opacity-60"
              >
                <Gavel className="h-4 w-4" aria-hidden />
                Save decision
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
