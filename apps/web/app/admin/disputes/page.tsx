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
          <button
            type="button"
            onClick={() => loadDisputes()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A] transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        }
      />

      {error ? <ErrorStateCard message={error} onRetry={loadDisputes} /> : null}
      {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}

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
                className={`w-full rounded-[1.5rem] border p-5 text-left shadow-sm transition ${
                  selectedId === dispute.id
                    ? 'border-[#C0392B] bg-[#FDEDEC]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
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

        <aside className="h-fit rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
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
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#C0392B]/60"
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
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#C0392B]/60"
              />
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Arbitration reason (required)"
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#C0392B]/60"
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
