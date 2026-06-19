'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Scale } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import LandlordPageHeader from '../../components/ui/LandlordPageHeader';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import { LandlordWorkspaceLoading } from '../../components/ui/WorkspaceLoading';
import { landlordInputClass, landlordSelectClass, statusPillClass } from '../../components/landlord/landlordUi';
import DisputeDetailPanel from '../../components/disputes/DisputeDetailPanel';

export default function LandlordDisputesPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [openDisputes, setOpenDisputes] = useState<any[]>([]);
  const [disputeId, setDisputeId] = useState('');
  const [dispute, setDispute] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [responseType, setResponseType] = useState<'accept_full' | 'accept_partial' | 'reject'>('accept_full');
  const [proposedAmount, setProposedAmount] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role && role !== 'LANDLORD' && role !== 'ADMIN') router.replace('/tenant/home');
  }, [loading, user, role, router]);

  const loadOpenDisputes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/deposits/landlord/disputes');
      setOpenDisputes(res.data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load disputes.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && (role === 'LANDLORD' || role === 'ADMIN')) {
      void loadOpenDisputes();
    }
  }, [user, role, loadOpenDisputes]);

  const handleLoadDispute = async (id?: string) => {
    const targetId = id || disputeId;
    if (!targetId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(`/disputes/${targetId}`);
      setDispute(response.data.data);
      setDisputeId(targetId);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load dispute.');
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
      await loadOpenDisputes();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to respond to dispute.');
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
        badge="Trust"
        title="Deposit disputes"
        subtitle="Same timeline, evidence, and ETA your tenant sees — no information asymmetry."
        actions={
          <button type="button" onClick={() => void loadOpenDisputes()} disabled={isLoading} className="landlord-btn-secondary">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        }
      />

      {error ? <ErrorStateCard message={error} onRetry={loadOpenDisputes} /> : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</p>
      ) : null}

      <section className="landlord-panel">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-[#C0392B]" aria-hidden />
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Open disputes</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">Select a case to view the shared timeline, evidence checklist, and estimated resolution date.</p>
        {isLoading && !openDisputes.length ? (
          <div className="mt-4">
            <SkeletonBlocks rows={3} />
          </div>
        ) : openDisputes.length ? (
          <div className="mt-4 space-y-3">
            {openDisputes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void handleLoadDispute(item.id)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  disputeId === item.id ? 'border-[#C0392B] bg-[#FDEDEC]' : 'border-slate-100 bg-[#F3F4F6] hover:border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[#1A1A1A]">{item.tenant_name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusPillClass(item.status)}`}>{item.status}</span>
                </div>
                {item.dispute_type ? (
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{item.dispute_type.replace(/_/g, ' ')}</p>
                ) : null}
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.claim_description}</p>
                {item.next_step ? <p className="mt-2 text-xs text-slate-500">Next: {item.next_step}</p> : null}
                {item.estimated_resolution_by ? (
                  <p className="text-xs text-slate-500">
                    Est. resolution by {new Date(item.estimated_resolution_by).toLocaleDateString()}
                  </p>
                ) : null}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No open disputes — great news for your portfolio.</p>
        )}
      </section>

      <section className="landlord-panel">
        <h2 className="text-lg font-semibold text-[#1A1A1A]">Dispute detail</h2>
        <p className="mt-1 text-sm text-slate-500">Load any dispute by ID if it is not in the open list.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input value={disputeId} onChange={(e) => setDisputeId(e.target.value)} placeholder="Dispute ID" className={`${landlordInputClass} flex-1`} />
          <button type="button" onClick={() => void handleLoadDispute()} className="landlord-btn-secondary">
            Load dispute
          </button>
        </div>
        {dispute ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <DisputeDetailPanel dispute={dispute} />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#1A1A1A]">Your response</h3>
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
              <button type="button" onClick={handleRespond} disabled={isLoading} className="landlord-btn-primary">
                Submit response
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
