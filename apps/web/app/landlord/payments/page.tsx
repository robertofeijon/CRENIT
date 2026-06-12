'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Percent, RefreshCw, Receipt, Wallet } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import LandlordPageHeader from '../../components/ui/LandlordPageHeader';
import LandlordStatCard from '../../components/ui/LandlordStatCard';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import { LandlordWorkspaceLoading } from '../../components/ui/WorkspaceLoading';
import { formatN$, landlordInputClass, landlordSelectClass, statusPillClass } from '../../components/landlord/landlordUi';

export default function LandlordPaymentsPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [confirmPopover, setConfirmPopover] = useState<{ id: string; received_date: string; amount: string } | null>(null);
  const [pendingSummary, setPendingSummary] = useState<any>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role && role !== 'LANDLORD' && role !== 'ADMIN') router.replace('/tenant/home');
  }, [loading, user, role, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const method = params.get('payment_method');
    const status = params.get('status');
    if (method) setPaymentMethodFilter(method.toUpperCase());
    if (status) setStatusFilter(status.toUpperCase());
  }, []);

  const loadPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/landlords/payments', {
        params: {
          status: statusFilter || undefined,
          payment_method: paymentMethodFilter || undefined,
          month: monthFilter || undefined,
          limit: 50,
        },
      });
      setPayments(response.data.data?.payments || []);
      setSummary(response.data.data?.summary || null);
      const pendingRes = await api.get('/landlords/payment-confirmations/pending').catch(() => null);
      setPendingSummary(pendingRes?.data?.data ?? null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load payments.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, paymentMethodFilter, monthFilter]);

  useEffect(() => {
    if (user && (role === 'LANDLORD' || role === 'ADMIN')) void loadPayments();
  }, [user, role, loadPayments]);

  const handleBulkConfirm = async () => {
    const ids = (pendingSummary?.payments || []).map((p: any) => p.id);
    if (!ids.length) return;
    setBulkLoading(true);
    try {
      await api.post('/landlords/payment-confirmations/bulk-confirm', { payment_ids: ids });
      setActionMessage(`Confirmed ${ids.length} payment(s).`);
      await loadPayments();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Bulk confirm failed.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleViewEftProof = async (paymentId: string) => {
    setError(null);
    try {
      const res = await api.get(`/landlords/payments/${paymentId}/eft-proof`);
      const url = res.data?.data?.signed_url;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      else setError('Proof URL unavailable.');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to open proof.');
    }
  };

  const handleConfirmPayment = async (paymentId: string, receivedDate?: string, amount?: string) => {
    setConfirmingId(paymentId);
    setActionMessage(null);
    setError(null);
    try {
      await api.post(`/landlords/payments/${paymentId}/confirm`, {
        received_date: receivedDate,
        amount: amount ? Number(amount) : undefined,
      });
      setActionMessage('Payment marked as received.');
      await loadPayments();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to confirm payment.');
    } finally {
      setConfirmingId(null);
    }
  };

  if (loading || !user) {
    return <LandlordWorkspaceLoading />;
  }

  const pendingDirect = payments.filter((p) => p.payment_method === 'DIRECT' && p.status === 'PENDING').length;
  const pendingEftProof = payments.filter(
    (p) => p.payment_method === 'EFT' && p.status === 'PROCESSING' && p.eft_proof_uploaded,
  ).length;

  return (
    <div className="space-y-6">
      <LandlordPageHeader
        badge="Finance"
        title="Payments"
        subtitle="Rent collections, direct-payment confirmations, and outstanding balances across your portfolio."
        actions={
          <button type="button" onClick={() => void loadPayments()} disabled={isLoading} className="landlord-btn-secondary">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        }
      />

      {error ? <ErrorStateCard message={error} onRetry={loadPayments} /> : null}
      {actionMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {actionMessage}
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <LandlordStatCard label="Expected" value={formatN$(summary?.total_expected)} icon={Receipt} />
        <LandlordStatCard label="Collected" value={formatN$(summary?.total_collected)} icon={CheckCircle2} accent="success" />
        <LandlordStatCard
          label="Outstanding"
          value={formatN$(summary?.outstanding)}
          icon={Wallet}
          accent={Number(summary?.outstanding) > 0 ? 'warning' : 'default'}
        />
        <LandlordStatCard
          label="Collection rate"
          value={`${summary?.collection_rate ?? 0}%`}
          icon={Percent}
          accent="dark"
        />
      </section>

      {pendingSummary?.pending_count > 0 ? (
        <section className="landlord-panel border-amber-200 bg-amber-50/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-950">
                {pendingSummary.pending_count} payment{pendingSummary.pending_count === 1 ? '' : 's'} awaiting confirmation
              </p>
              <p className="mt-1 text-xs text-amber-900/90">
                Auto-confirms after {pendingSummary.auto_confirm_hours}h unless disputed.{' '}
                {pendingSummary.overdue_confirm_count > 0
                  ? `${pendingSummary.overdue_confirm_count} overdue for review.`
                  : ''}
              </p>
            </div>
            <button type="button" className="landlord-btn-primary" disabled={bulkLoading} onClick={() => void handleBulkConfirm()}>
              {bulkLoading ? 'Confirming…' : 'Confirm all uncontested'}
            </button>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {(pendingSummary.payments || []).slice(0, 5).map((p: any) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2">
                <span>N${Number(p.amount_gross || 0).toLocaleString()} · {p.aging_hours}h waiting</span>
                <a href={p.confirm_url} className="font-semibold text-[#C0392B] hover:underline">
                  One-tap confirm →
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : pendingDirect > 0 ? (
        <div className="landlord-panel border-amber-200 bg-amber-50/80">
          <p className="text-sm font-semibold text-amber-950">
            {pendingDirect} direct payment{pendingDirect === 1 ? '' : 's'} awaiting your confirmation
          </p>
          <p className="mt-1 text-xs text-amber-900/90">Confirm receipt so tenant credit scores update correctly.</p>
        </div>
      ) : null}
      {pendingEftProof > 0 ? (
        <div className="landlord-panel border-sky-200 bg-sky-50/80">
          <p className="text-sm font-semibold text-sky-950">
            {pendingEftProof} EFT payment{pendingEftProof === 1 ? '' : 's'} with proof awaiting confirmation
          </p>
          <p className="mt-1 text-xs text-sky-900/90">Review the uploaded proof, then mark as received.</p>
        </div>
      ) : null}

      <section className="landlord-panel">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Filters</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            className={landlordSelectClass}
            aria-label="Payment method"
          >
            <option value="">All methods</option>
            <option value="DIRECT">Direct</option>
            <option value="EFT">EFT</option>
            <option value="CARD">Card</option>
            <option value="MOBILE_MONEY">Mobile money</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={landlordSelectClass} aria-label="Status">
            <option value="">All statuses</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="OVERDUE">Overdue</option>
            <option value="FAILED">Failed</option>
            <option value="PROCESSING">Processing</option>
          </select>
          <input
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className={landlordInputClass}
            placeholder="YYYY-MM"
            aria-label="Month"
          />
          <button type="button" onClick={() => void loadPayments()} disabled={isLoading} className="landlord-btn-primary">
            Apply filters
          </button>
        </div>
      </section>

      <section className="landlord-panel">
        <h2 className="text-lg font-semibold text-[#1A1A1A]">Payment ledger</h2>
        {isLoading ? (
          <div className="mt-4">
            <SkeletonBlocks rows={4} />
          </div>
        ) : payments.length ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-[#F3F4F6] text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-semibold">Unit</th>
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Due</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment: any) => {
                  const needsConfirm =
                    (payment.payment_method === 'DIRECT' && payment.status === 'PENDING') ||
                    (payment.payment_method === 'EFT' && payment.status === 'PROCESSING' && payment.eft_proof_uploaded);
                  const hasEftProof = payment.payment_method === 'EFT' && payment.eft_proof_uploaded;
                  return (
                    <tr
                      key={payment.id}
                      className={`border-b border-slate-50 ${needsConfirm ? 'bg-amber-50/60' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-4 py-3 font-medium text-[#1A1A1A]">{payment.property || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{payment.payment_method || '—'}</td>
                      <td className="px-4 py-3 tabular-nums font-semibold">
                        {formatN$(payment.amount_gross || payment.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusPillClass(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {payment.due_date ? new Date(payment.due_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="relative px-4 py-3">
                        {needsConfirm ? (
                          <>
                            {hasEftProof ? (
                              <button
                                type="button"
                                onClick={() => void handleViewEftProof(payment.id)}
                                className="landlord-btn-secondary mb-2 py-2 text-xs"
                              >
                                View proof
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmPopover({
                                  id: payment.id,
                                  received_date: new Date().toISOString().slice(0, 10),
                                  amount: String(payment.amount_gross || payment.amount || ''),
                                })
                              }
                              className="landlord-btn-primary py-2 text-xs"
                            >
                              Mark received
                            </button>
                            {confirmPopover?.id === payment.id ? (
                              <div className="absolute right-0 top-10 z-20 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
                                {(() => {
                                  const pop = confirmPopover;
                                  if (!pop) return null;
                                  return (
                                    <>
                                <label className="text-xs font-medium text-slate-600">Date received</label>
                                <input
                                  type="date"
                                  value={pop.received_date}
                                  onChange={(e) =>
                                    setConfirmPopover((prev) => (prev ? { ...prev, received_date: e.target.value } : prev))
                                  }
                                  className={`${landlordInputClass} mt-1 py-2 text-xs`}
                                />
                                <label className="mt-2 block text-xs font-medium text-slate-600">Amount</label>
                                <input
                                  type="number"
                                  value={pop.amount}
                                  onChange={(e) =>
                                    setConfirmPopover((prev) => (prev ? { ...prev, amount: e.target.value } : prev))
                                  }
                                  className={`${landlordInputClass} mt-1 py-2 text-xs`}
                                />
                                <div className="mt-3 flex justify-end gap-2">
                                  <button type="button" onClick={() => setConfirmPopover(null)} className="landlord-btn-secondary py-1.5 text-xs">
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    disabled={confirmingId === payment.id}
                                    onClick={async () => {
                                      await handleConfirmPayment(payment.id, pop.received_date, pop.amount);
                                      setConfirmPopover(null);
                                    }}
                                    className="landlord-btn-primary py-1.5 text-xs"
                                  >
                                    Confirm
                                  </button>
                                </div>
                                    </>
                                  );
                                })()}
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4">
            <EmptyStateCard title="No payments" description="Try adjusting filters or record rent through active leases." />
          </div>
        )}
      </section>
    </div>
  );
}
