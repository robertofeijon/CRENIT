"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function TenantDepositPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [deposit, setDeposit] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
      return;
    }

    if (!loading && user) {
      loadDeposit();
    }
  }, [loading, user, router]);

  const loadDeposit = async () => {
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
  };

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
      formData.append('reason', reason);
      formData.append('description', description);
      formData.append('requested_amount', String(Number(requestedAmount)));
      if (evidenceFile) {
        formData.append('evidence', evidenceFile, evidenceFile.name);
      }

      const response = await api.post('/disputes/file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const id = response.data.data?.dispute_id;
      setSubmitMessage(`Dispute filed successfully as ${id}.`);
      setDisputeId(id || '');
      setReason('');
      setDescription('');
      setRequestedAmount('');
      setEvidenceFile(null);
    } catch (err: any) {
      setSubmitMessage(err?.response?.data?.message || err?.message || 'Unable to file dispute.');
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
      setDisputeError(err?.response?.data?.message || err?.message || 'Unable to load dispute.');
    } finally {
      setDisputeLoading(false);
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8">Loading data...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Tenant Deposit</h1>
            <p className="mt-3 text-sm text-slate-600">Review escrow status and submit deposit disputes.</p>
          </div>
          <button
            onClick={() => router.push('/tenant')}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Back to dashboard
          </button>
        </div>

        <div className="mt-8 rounded-3xl bg-slate-50 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Current deposit</h2>
          {isLoading ? (
            <p className="mt-4 text-sm text-slate-500">Loading data...</p>
          ) : error ? (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          ) : deposit ? (
            <>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-white p-5">
                  <p className="text-sm text-slate-500">Status</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{deposit.status}</p>
                </div>
                <div className="rounded-3xl bg-white p-5">
                  <p className="text-sm text-slate-500">Amount held</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">N${Number(deposit.amount || 0).toLocaleString()}</p>
                </div>
                {deposit.sim_escrow_id ? (
                  <div className="rounded-3xl bg-white p-5 sm:col-span-2">
                    <p className="text-sm text-slate-500">Escrow reference</p>
                    <p className="mt-2 font-mono text-sm text-slate-900">{deposit.sim_escrow_id}</p>
                  </div>
                ) : null}
              </div>
              {deposit.timeline?.length ? (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Timeline</h3>
                  <div className="mt-3 space-y-3">
                    {deposit.timeline.map((event: any, index: number) => (
                      <div key={`${event.type}-${index}`} className="rounded-2xl bg-white p-4">
                        <p className="font-medium text-slate-900">{event.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{new Date(event.at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No active deposit record found.</p>
          )}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">File a dispute</h2>
            <p className="mt-2 text-sm text-slate-500">Submit a dispute for your deposit with optional supporting evidence.</p>
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Reason</label>
                <input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
                  placeholder="Why are you disputing this charge?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
                  placeholder="Describe the reason for the dispute."
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Requested refund amount</label>
                <input
                  value={requestedAmount}
                  onChange={(event) => setRequestedAmount(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
                  placeholder="Enter amount in N$"
                  type="number"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Evidence file</label>
                <input
                  type="file"
                  onChange={(event) => setEvidenceFile(event.target.files?.[0] || null)}
                  className="mt-2 text-sm text-slate-600"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSubmitDispute}
                  disabled={submitLoading || !deposit}
                  className="rounded-2xl bg-brand-red px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitLoading ? 'Saving dispute...' : 'Submit dispute'}
                </button>
                <button
                  onClick={() => router.push('/tenant/payments')}
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  View payment history
                </button>
              </div>
              {submitMessage ? <p className="text-sm text-slate-700">{submitMessage}</p> : null}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Track dispute</h2>
            <p className="mt-2 text-sm text-slate-500">Lookup the status of an existing dispute using its identifier.</p>
            <div className="mt-6 space-y-4">
              <input
                value={disputeId}
                onChange={(event) => setDisputeId(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
                placeholder="Dispute ID"
              />
              <button
                onClick={handleLoadDispute}
                disabled={disputeLoading || !disputeId}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {disputeLoading ? 'Loading dispute details...' : 'Load dispute details'}
              </button>
              {disputeError ? <p className="text-sm text-red-600">{disputeError}</p> : null}
              {dispute ? (
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Dispute ID</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{dispute.id}</p>
                  <p className="mt-3 text-sm text-slate-600">Status: {dispute.status}</p>
                  <p className="mt-2 text-sm text-slate-600">Requested amount: N${Number(dispute.requested_amount || 0).toLocaleString()}</p>
                  <p className="mt-2 text-sm text-slate-600">Reason: {dispute.reason}</p>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
