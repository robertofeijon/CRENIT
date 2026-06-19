'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PiggyBank, RefreshCw, Search } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import TenantPageHeader from '../../components/ui/TenantPageHeader';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import EmptyStateCard from '../../components/ui/EmptyStateCard';
import { TenantWorkspaceLoading } from '../../components/ui/WorkspaceLoading';
import { formatN$, statusPillClass, tenantInputClass } from '../../components/tenant/tenantUi';
import DisputeDetailPanel from '../../components/disputes/DisputeDetailPanel';

export default function TenantDepositPage() {
  const { user, loading, roleReady } = useAuth();
  const router = useRouter();
  const [deposit, setDeposit] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disputeType, setDisputeType] = useState('DAMAGE_CLAIM');
  const [templates, setTemplates] = useState<Record<string, any>>({});
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [disputeId, setDisputeId] = useState('');
  const [dispute, setDispute] = useState<any>(null);
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [appealLoading, setAppealLoading] = useState(false);

  useEffect(() => {
    if (!loading && roleReady && !user) router.replace('/auth');
    if (!loading && roleReady && user) void loadDeposit();
    api.get('/disputes/templates').then((res) => setTemplates(res.data?.data || {})).catch(() => null);
  }, [loading, roleReady, user, router]);

  const loadDeposit = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/deposits/me');
      setDeposit(response.data.data || null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load deposit details.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubmitDispute = async () => {
    if (!deposit?.id) {
      setSubmitMessage('No deposit available to dispute.');
      return;
    }
    if (!reason || !description || !requestedAmount) {
      setSubmitMessage('Please provide reason, description, and requested amount.');
      return;
    }
    setSubmitLoading(true);
    setSubmitMessage(null);
    try {
      const formData = new FormData();
      formData.append('deposit_id', deposit.id);
      formData.append('dispute_type', disputeType);
      formData.append('reason', reason);
      formData.append('description', description);
      formData.append('requested_amount', String(Number(requestedAmount)));
      if (evidenceFile) formData.append('evidence', evidenceFile, evidenceFile.name);

      const response = await api.post('/disputes/file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const id = response.data.data?.dispute_id;
      setSubmitMessage(`Dispute filed successfully (${id}).`);
      setDisputeId(id || '');
      setReason('');
      setDescription('');
      setRequestedAmount('');
      setEvidenceFile(null);
    } catch (err: any) {
      setSubmitMessage(err?.response?.data?.message || 'Unable to file dispute.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleLoadDispute = async () => {
    if (!disputeId) {
      setDisputeError('Enter a dispute ID to view details.');
      return;
    }
    setDisputeLoading(true);
    setDisputeError(null);
    try {
      const response = await api.get(`/disputes/${disputeId}`);
      setDispute(response.data.data);
    } catch (err: any) {
      setDisputeError(err?.response?.data?.message || 'Unable to load dispute.');
    } finally {
      setDisputeLoading(false);
    }
  };

  if (loading || !roleReady || !user) {
    return <TenantWorkspaceLoading />;
  }

  return (
    <div className="space-y-6">
      <TenantPageHeader
        badge="Deposit"
        title="Security deposit"
        subtitle="Review escrow status, timeline, and file a dispute if needed."
        actions={
          <button type="button" onClick={() => void loadDeposit()} disabled={isLoading} className="tenant-btn-secondary">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        }
      />

      {error ? <ErrorStateCard message={error} onRetry={() => void loadDeposit()} /> : null}
      {submitMessage ? (
        <p className="rounded-xl border border-slate-200 bg-[#F3F4F6] px-4 py-3 text-sm text-slate-800">{submitMessage}</p>
      ) : null}

      <section className="tenant-panel">
        <div className="flex items-center gap-2">
          <PiggyBank className="h-5 w-5 text-[#C0392B]" aria-hidden />
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Current deposit</h2>
        </div>
        {isLoading ? (
          <div className="mt-4">
            <SkeletonBlocks rows={2} />
          </div>
        ) : deposit ? (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-[#F3F4F6] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Status</p>
                <p className="mt-2">
                  <span className={`rounded-full px-2.5 py-1 text-sm font-semibold ${statusPillClass(deposit.status)}`}>
                    {deposit.status}
                  </span>
                </p>
              </div>
              <div className="rounded-xl bg-[#F3F4F6] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Amount held</p>
                <p className="mt-2 text-2xl font-semibold text-[#1A1A1A]">{formatN$(deposit.amount)}</p>
              </div>
              {deposit.sim_escrow_id ? (
                <div className="rounded-xl bg-[#F3F4F6] p-5 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Escrow reference</p>
                  <p className="mt-2 font-mono text-sm text-[#1A1A1A]">{deposit.sim_escrow_id}</p>
                </div>
              ) : null}
            </div>
            {deposit.timeline?.length ? (
              <div className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Timeline</h3>
                <div className="mt-3 space-y-2">
                  {deposit.timeline.map((event: any, index: number) => (
                    <div key={`${event.type}-${index}`} className="rounded-xl bg-[#F3F4F6] p-4">
                      <p className="font-medium text-[#1A1A1A]">{event.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{new Date(event.at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="mt-4">
            <EmptyStateCard
              title="No deposit on file"
              description="Your landlord will record a deposit when your lease starts. Check back after move-in."
            />
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="tenant-panel">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">File a dispute</h2>
          <p className="mt-2 text-sm text-slate-500">Submit a dispute with optional supporting evidence.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Dispute type</label>
              <select value={disputeType} onChange={(e) => setDisputeType(e.target.value)} className={tenantInputClass}>
                {Object.entries(templates).map(([key, tpl]: [string, any]) => (
                  <option key={key} value={key}>
                    {tpl.label}
                  </option>
                ))}
                {!Object.keys(templates).length ? (
                  <>
                    <option value="DAMAGE_CLAIM">Property damage</option>
                    <option value="UNPAID_UTILITIES">Unpaid utilities</option>
                    <option value="EARLY_EXIT">Early exit</option>
                    <option value="OTHER">Other</option>
                  </>
                ) : null}
              </select>
              {templates[disputeType] ? (
                <ul className="mt-2 list-inside list-disc text-xs text-slate-500">
                  {(templates[disputeType].checklist || []).map((item: string) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Reason</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} className={tenantInputClass} placeholder="Why are you disputing?" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${tenantInputClass} min-h-[100px]`}
                rows={4}
                placeholder="Describe the issue in detail"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Requested refund</label>
              <input
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(e.target.value)}
                className={tenantInputClass}
                type="number"
                min={0}
                placeholder="Amount in N$"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Evidence (optional)</label>
              <input type="file" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} className="text-sm text-slate-600" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="tenant-btn-primary" disabled={submitLoading || !deposit} onClick={() => void handleSubmitDispute()}>
                {submitLoading ? 'Submitting…' : 'Submit dispute'}
              </button>
              <Link href="/tenant/payments" className="tenant-btn-secondary">
                Payment history
              </Link>
            </div>
          </div>
        </section>

        <section className="tenant-panel">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-[#C0392B]" aria-hidden />
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Track dispute</h2>
          </div>
          <div className="mt-4 space-y-3">
            <input value={disputeId} onChange={(e) => setDisputeId(e.target.value)} className={tenantInputClass} placeholder="Dispute ID" />
            <button
              type="button"
              className="tenant-btn-primary w-full"
              disabled={disputeLoading || !disputeId}
              onClick={() => void handleLoadDispute()}
            >
              {disputeLoading ? 'Loading…' : 'Load details'}
            </button>
            {disputeError ? <p className="text-sm text-red-600">{disputeError}</p> : null}
            {dispute ? (
              <DisputeDetailPanel
                dispute={dispute}
                appealReason={appealReason}
                appealLoading={appealLoading}
                onAppealReasonChange={setAppealReason}
                onAppeal={async (reason) => {
                  if (!dispute?.id || !reason.trim()) {
                    setDisputeError('Enter a reason to file an appeal.');
                    return;
                  }
                  setAppealLoading(true);
                  setDisputeError(null);
                  try {
                    await api.post(`/disputes/${dispute.id}/appeal`, { reason: reason.trim() });
                    setAppealReason('');
                    await handleLoadDispute();
                    setSubmitMessage('Appeal submitted for senior review.');
                  } catch (err: any) {
                    setDisputeError(err?.response?.data?.message || 'Unable to file appeal.');
                  } finally {
                    setAppealLoading(false);
                  }
                }}
              />
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
