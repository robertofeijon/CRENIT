"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function LandlordDepositsPage() {
  const { user, loading } = useAuth();
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
    if (!loading && user) {
      loadDeposits();
      loadTenants();
    }
  }, [loading, user, router]);

  const loadDeposits = async () => {
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
  };

  const loadTenants = async () => {
    try {
      const res = await api.get('/landlords/tenants');
      setTenants(res.data.data || []);
    } catch {
      setTenants([]);
    }
  };

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
    return <div className="min-h-screen bg-slate-50 p-8">Preparing deposits...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Deposits & escrow</h1>
              <p className="mt-3 text-sm text-slate-600">Collect deposits, manage refunds, and handle disputes.</p>
            </div>
            <button onClick={() => router.push('/landlord')} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
              Back
            </button>
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Collect deposit</h2>
          <p className="mt-2 text-sm text-slate-500">Hold a tenant deposit in escrow for an active lease.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <select
              value={collectLeaseId}
              onChange={(e) => setCollectLeaseId(e.target.value)}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="">Select tenant lease</option>
              {tenants.map((t) => (
                <option key={t.leaseId} value={t.leaseId}>
                  {t.tenantName} — {t.leaseId?.slice(0, 8)}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Amount N$"
              value={collectAmount}
              onChange={(e) => setCollectAmount(e.target.value)}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
            />
            <button onClick={handleCollect} disabled={isLoading} className="rounded-2xl bg-brand-red px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
              Collect deposit
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Escrow balances</h2>
          {isLoading && !deposits.length ? (
            <p className="mt-4 text-sm text-slate-500">Loading...</p>
          ) : deposits.length ? (
            <div className="mt-6 space-y-4">
              {deposits.map((deposit) => (
                <div key={deposit.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{deposit.tenant_name}</p>
                      <p className="text-sm text-slate-600">N${Number(deposit.amount).toLocaleString()} · {deposit.status}</p>
                      {deposit.sim_escrow_id ? <p className="mt-1 font-mono text-xs text-slate-500">{deposit.sim_escrow_id}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {deposit.status === 'HELD' ? (
                        <button
                          onClick={() => handleRefundRequest(deposit.id)}
                          disabled={actionLoadingId === deposit.id}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                        >
                          Request refund
                        </button>
                      ) : null}
                      {['HELD', 'REFUND_PENDING'].includes(deposit.status) ? (
                        <button
                          onClick={() => handleRelease(deposit.id)}
                          disabled={actionLoadingId === deposit.id}
                          className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                        >
                          Release funds
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {deposit.timeline?.length ? (
                    <div className="mt-4 space-y-2">
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
            <p className="mt-4 text-sm text-slate-500">No deposits recorded yet.</p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Dispute tools</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input value={disputeId} onChange={(e) => setDisputeId(e.target.value)} placeholder="Dispute ID" className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
            <button onClick={handleLoadDispute} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Load dispute</button>
          </div>
          {dispute ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                <p>Status: {dispute.status}</p>
                <p className="mt-2">{dispute.claim_description}</p>
              </div>
              <div className="space-y-3">
                <select value={responseType} onChange={(e) => setResponseType(e.target.value as any)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm">
                  <option value="accept_full">Accept full</option>
                  <option value="accept_partial">Accept partial</option>
                  <option value="reject">Reject</option>
                </select>
                <input value={proposedAmount} onChange={(e) => setProposedAmount(e.target.value)} placeholder="Proposed amount" className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Notes" rows={3} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
                <button onClick={handleRespond} className="rounded-2xl bg-brand-red px-5 py-3 text-sm font-semibold text-white">Submit response</button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
