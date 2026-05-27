"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';

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

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  const loadDisputes = () => {
    setIsLoading(true);
    api
      .get('/admin/disputes/pending')
      .then((res) => setDisputes(res.data.data.disputes || []))
      .catch((err: any) => setError(err?.response?.data?.message || err?.message || 'Unable to load disputes.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (user && role === 'ADMIN') loadDisputes();
  }, [user, role]);

  const handleArbitrate = async () => {
    if (!selectedId || !reason || !amountToTenant) {
      setError('Select dispute, amount, and reason.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await api.post(`/admin/disputes/${selectedId}/arbitrate`, {
        decision,
        amount_to_tenant: Number(amountToTenant),
        reason,
      });
      setMessage('Arbitration recorded.');
      setReason('');
      setAmountToTenant('');
      loadDisputes();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to arbitrate.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-bold text-slate-900">Escrow disputes</h1>
      <p className="mt-3 text-sm text-slate-600">Review open disputes and record arbitration decisions.</p>
      {error ? <div className="mt-4"><ErrorStateCard message={error} onRetry={loadDisputes} /></div> : null}
      {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
      {isLoading && !disputes.length ? (
        <div className="mt-6">
          <SkeletonBlocks rows={3} />
        </div>
      ) : disputes.length ? (
        <div className="mt-6 space-y-4">
          {disputes.map((dispute) => (
            <button
              key={dispute.id}
              type="button"
              onClick={() => setSelectedId(dispute.id)}
              className={`w-full rounded-2xl border p-4 text-left text-sm transition ${
                selectedId === dispute.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <p className="font-semibold">{dispute.id}</p>
              <p className="mt-1 opacity-80">{dispute.status}</p>
              <p className="mt-2 line-clamp-2 opacity-70">{dispute.claim_description}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyStateCard title="No open disputes" description="All disputes are currently resolved or closed." />
        </div>
      )}
      {selectedId ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="font-semibold text-slate-900">Arbitrate dispute</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <select value={decision} onChange={(e) => setDecision(e.target.value as any)} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm">
              <option value="tenant_wins">Tenant wins</option>
              <option value="landlord_wins">Landlord wins</option>
              <option value="split">Split</option>
            </select>
            <input value={amountToTenant} onChange={(e) => setAmountToTenant(e.target.value)} placeholder="Amount to tenant N$" type="number" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" rows={3} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm sm:col-span-2" />
          </div>
          <button onClick={handleArbitrate} disabled={isLoading} className="mt-4 rounded-2xl bg-brand-red px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
            Save decision
          </button>
        </div>
      ) : null}
    </div>
  );
}
