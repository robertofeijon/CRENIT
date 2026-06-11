'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, RefreshCw, Scale, Wallet } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import LandlordPageHeader from '../../components/ui/LandlordPageHeader';
import LandlordStatCard from '../../components/ui/LandlordStatCard';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import { LandlordWorkspaceLoading } from '../../components/ui/WorkspaceLoading';
import { formatN$, landlordInputClass, landlordSelectClass, statusPillClass } from '../../components/landlord/landlordUi';

export default function LandlordDepositsPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [deposits, setDeposits] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [collectLeaseId, setCollectLeaseId] = useState('');
  const [collectAmount, setCollectAmount] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [disputeId, setDisputeId] = useState('');
  const [dispute, setDispute] = useState<any>(null);
  const [responseType, setResponseType] = useState<'accept_full' | 'accept_partial' | 'reject'>('accept_full');
  const [proposedAmount, setProposedAmount] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role && role !== 'LANDLORD' && role !== 'ADMIN') router.replace('/tenant/home');
  }, [loading, user, role, router]);

  const loadDeposits = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/deposits/landlord');
      setDeposits(response.data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load deposits.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadTenants = useCallback(async () => {
    try {
      const res = await api.get('/landlords/tenants');
      setTenants(res.data.data || []);
    } catch {
      setTenants([]);
    }
  }, []);

  useEffect(() => {
    if (user && (role === 'LANDLORD' || role === 'ADMIN')) {
      void loadDeposits();
      void loadTenants();
    }
  }, [user, role, loadDeposits, loadTenants]);

  const depositStats = useMemo(() => {
    const held = deposits.filter((d) => d.status === 'HELD');
    const totalHeld = held.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const pendingRefund = deposits.filter((d) => d.status === 'REFUND_PENDING').length;
    return { count: deposits.length, totalHeld, pendingRefund };
  }, [deposits]);

  const handleCollect = async () => {
    if (!collectLeaseId || !collectAmount) {
      setError('Select a tenant lease and enter an amount.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      await api.post('/deposits/collect', { lease_id: collectLeaseId, amount: Number(collectAmount) });
      setMessage('Deposit collected into escrow.');
      setCollectLeaseId('');
      setCollectAmount('');
      await loadDeposits();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to collect deposit.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefundRequest = async (depositId: string) => {
    setActionLoadingId(depositId);
    setError(null);
    try {
      await api.post(`/deposits/${depositId}/refund-request`);
      setMessage('Refund marked as pending.');
      await loadDeposits();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to request refund.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRelease = async (depositId: string) => {
    setActionLoadingId(depositId);
    setError(null);
    try {
      await api.post(`/deposits/${depositId}/release`);
      setMessage('Deposit released to tenant.');
      await loadDeposits();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to release deposit.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLoadDispute = async () => {
    if (!disputeId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(`/disputes/${disputeId}`);
      setDispute(response.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load dispute.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!disputeId) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('response', responseType);
      if (reason) formData.append('reason', reason);
      if (proposedAmount) formData.append('proposed_amount', String(Number(proposedAmount)));
      if (file) formData.append('evidence', file, file.name);
      await api.post(`/disputes/${disputeId}/respond`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage('Dispute response submitted.');
      await handleLoadDispute();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to respond to dispute.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || !user) {
    return <LandlordWorkspaceLoading />;
  }

  return (
    <div className="space-y-6">
      <LandlordPageHeader
        badge="Finance"
        title="Deposits & escrow"
        subtitle="Collect deposits, manage refunds, and handle disputes."
        actions={
          <button type="button" onClick={() => void loadDeposits()} disabled={isLoading} className="landlord-btn-secondary">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        }
      />

      {error ? <ErrorStateCard message={error} onRetry={loadDeposits} /> : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <LandlordStatCard label="Total deposits" value={depositStats.count} icon={Wallet} />
        <LandlordStatCard label="Held in escrow" value={formatN$(depositStats.totalHeld)} icon={Lock} accent="warning" />
        <LandlordStatCard label="Pending refunds" value={depositStats.pendingRefund} icon={Scale} accent={depositStats.pendingRefund > 0 ? 'warning' : 'default'} />
      </section>

      <section className="landlord-panel">
        <h2 className="text-lg font-semibold text-[#1A1A1A]">Collect deposit</h2>
        <p className="mt-1 text-sm text-slate-500">Hold a tenant deposit in escrow for an active lease.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <select value={collectLeaseId} onChange={(e) => setCollectLeaseId(e.target.value)} className={landlordSelectClass}>
            <option value="">Select tenant lease</option>
            {tenants.map((t) => (
              <option key={t.leaseId} value={t.leaseId}>
                {t.tenantName} — {t.leaseId?.slice(0, 8)}
              </option>
            ))}
          </select>
          <input type="number" placeholder="Amount N$" value={collectAmount} onChange={(e) => setCollectAmount(e.target.value)} className={landlordInputClass} />
          <button type="button" onClick={handleCollect} disabled={isLoading} className="landlord-btn-primary">
            Collect deposit
          </button>
        </div>
      </section>

      <section className="landlord-panel">
        <h2 className="text-lg font-semibold text-[#1A1A1A]">Escrow balances</h2>
        {isLoading && !deposits.length ? (
          <div className="mt-4">
            <SkeletonBlocks rows={3} />
          </div>
        ) : deposits.length ? (
          <div className="mt-4 space-y-3">
            {deposits.map((deposit) => (
              <div key={deposit.id} className="rounded-xl border border-slate-100 bg-[#F3F4F6] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-[#1A1A1A]">{deposit.tenant_name}</p>
                    <p className="text-sm text-slate-600">
                      {formatN$(deposit.amount)} ·{' '}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusPillClass(deposit.status)}`}>{deposit.status}</span>
                    </p>
                    {deposit.sim_escrow_id ? <p className="mt-1 font-mono text-xs text-slate-500">{deposit.sim_escrow_id}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {deposit.status === 'HELD' ? (
                      <button type="button" onClick={() => handleRefundRequest(deposit.id)} disabled={actionLoadingId === deposit.id} className="landlord-btn-secondary py-2 text-xs">
                        Request refund
                      </button>
                    ) : null}
                    {['HELD', 'REFUND_PENDING'].includes(deposit.status) ? (
                      <button type="button" onClick={() => handleRelease(deposit.id)} disabled={actionLoadingId === deposit.id} className="landlord-btn-primary bg-emerald-600 py-2 text-xs hover:bg-emerald-700">
                        Release funds
                      </button>
                    ) : null}
                  </div>
                </div>
                {deposit.timeline?.length ? (
                  <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                    {deposit.timeline.map((event: any, i: number) => (
                      <p key={i} className="text-xs text-slate-600">
                        {new Date(event.at).toLocaleDateString()} — {event.label}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyStateCard title="No deposits" description="Collect a deposit for an active lease to get started." />
          </div>
        )}
      </section>

      <section className="landlord-panel">
        <h2 className="text-lg font-semibold text-[#1A1A1A]">Dispute tools</h2>
        <p className="mt-1 text-sm text-slate-500">Load a dispute by ID and submit your response with evidence.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input value={disputeId} onChange={(e) => setDisputeId(e.target.value)} placeholder="Dispute ID" className={`${landlordInputClass} flex-1`} />
          <button type="button" onClick={handleLoadDispute} className="landlord-btn-secondary">
            Load dispute
          </button>
        </div>
        {dispute ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-[#F3F4F6] p-4 text-sm text-slate-700">
              <p>
                Status:{' '}
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusPillClass(dispute.status)}`}>{dispute.status}</span>
              </p>
              <p className="mt-2">{dispute.claim_description}</p>
            </div>
            <div className="space-y-3">
              <select value={responseType} onChange={(e) => setResponseType(e.target.value as typeof responseType)} className={landlordSelectClass}>
                <option value="accept_full">Accept full</option>
                <option value="accept_partial">Accept partial</option>
                <option value="reject">Reject</option>
              </select>
              <input value={proposedAmount} onChange={(e) => setProposedAmount(e.target.value)} placeholder="Proposed amount N$" className={landlordInputClass} />
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Notes" rows={3} className={`${landlordInputClass} min-h-[80px]`} />
              <label className={`${landlordInputClass} flex cursor-pointer items-center gap-2 py-2 text-sm`}>
                <span className="truncate text-slate-600">{file ? file.name : 'Attach evidence file…'}</span>
                <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
              <button type="button" onClick={handleRespond} className="landlord-btn-primary">
                Submit response
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
