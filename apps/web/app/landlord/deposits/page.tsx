"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function LandlordDepositsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [disputeId, setDisputeId] = useState('');
  const [dispute, setDispute] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseType, setResponseType] = useState<'accept_full' | 'accept_partial' | 'reject'>('accept_full');
  const [proposedAmount, setProposedAmount] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
      return;
    }
  }, [loading, user, router]);

  const handleLoadDispute = async () => {
    if (!disputeId) {
      setError('Enter a dispute ID to review.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSubmitMessage(null);

    try {
      const response = await api.get(`/disputes/${disputeId}`);
      setDispute(response.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load dispute.');
      setDispute(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!disputeId) {
      setError('Enter dispute ID before submitting a response.');
      return;
    }

    setSubmitLoading(true);
    setError(null);
    setSubmitMessage(null);

    try {
      const formData = new FormData();
      formData.append('response', responseType);
      if (reason) formData.append('reason', reason);
      if (proposedAmount) formData.append('proposed_amount', String(Number(proposedAmount)));
      if (file) formData.append('evidence', file, file.name);

      const response = await api.post(`/disputes/${disputeId}/respond`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSubmitMessage('Response submitted successfully.');
      setReason('');
      setProposedAmount('');
      setFile(null);
      if (response.data?.data) {
        setDispute(response.data.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to submit dispute response.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAcceptSettlement = async () => {
    if (!disputeId) {
      setError('Enter dispute ID before accepting settlement.');
      return;
    }

    setSubmitLoading(true);
    setError(null);
    setSubmitMessage(null);

    try {
      const response = await api.post(`/disputes/${disputeId}/accept-settlement`, { accept: true });
      setSubmitMessage('Settlement accepted.');
      if (response.data?.data) {
        setDispute(response.data.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to accept settlement.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-slate-50 p-8">Preparing dispute tools...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Landlord Deposits</h1>
            <p className="mt-3 text-sm text-slate-600">Review deposit disputes and reply to tenant settlement requests.</p>
          </div>
          <button
            onClick={() => router.push('/landlord')}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Back to dashboard
          </button>
        </div>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Dispute lookup</h2>
              <p className="mt-2 text-sm text-slate-500">Enter a dispute ID to review the details and respond from the landlord side.</p>
            </div>
            <button
              onClick={handleLoadDispute}
              disabled={isLoading}
              className="rounded-2xl bg-brand-red px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Loading...' : 'Load dispute'}
            </button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <input
              value={disputeId}
              onChange={(event) => setDisputeId(event.target.value)}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
              placeholder="Enter dispute ID"
            />
            <button
              onClick={handleAcceptSettlement}
              disabled={submitLoading || !disputeId}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Accept settlement
            </button>
          </div>
          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
          {submitMessage ? <p className="mt-4 text-sm text-slate-700">{submitMessage}</p> : null}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Respond to dispute</h2>
            <p className="mt-2 text-sm text-slate-500">Submit a landlord response with optional evidence and proposed amounts.</p>
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Response</label>
                <select
                  value={responseType}
                  onChange={(event) => setResponseType(event.target.value as 'accept_full' | 'accept_partial' | 'reject')}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
                >
                  <option value="accept_full">Accept full settlement</option>
                  <option value="accept_partial">Accept partial settlement</option>
                  <option value="reject">Reject</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Proposed amount</label>
                <input
                  value={proposedAmount}
                  onChange={(event) => setProposedAmount(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
                  placeholder="Enter an amount in N$"
                  type="number"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Reason or notes</label>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
                  rows={4}
                  placeholder="Add optional reasoning for your response"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Supporting file</label>
                <input
                  type="file"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  className="mt-2 text-sm text-slate-600"
                />
              </div>
              <button
                onClick={handleRespond}
                disabled={submitLoading || !disputeId}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitLoading ? 'Sending response...' : 'Submit response'}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Dispute details</h2>
            <p className="mt-2 text-sm text-slate-500">Loaded dispute metadata will appear here after you look it up.</p>
            {dispute ? (
              <div className="mt-6 space-y-4 rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Dispute ID</p>
                <p className="text-lg font-semibold text-slate-900">{dispute.id}</p>
                <p className="text-sm text-slate-600">Status: {dispute.status}</p>
                <p className="text-sm text-slate-600">Requested amount: N${Number(dispute.requested_amount || 0).toLocaleString()}</p>
                <p className="text-sm text-slate-600">Reason: {dispute.reason}</p>
                <p className="text-sm text-slate-600">Tenant note: {dispute.description}</p>
              </div>
            ) : (
              <p className="mt-6 text-sm text-slate-500">No dispute loaded yet. Enter an ID and click load.</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
