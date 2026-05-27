"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';

export const dynamic = 'force-dynamic';

export default function LandlordPaymentsPage() {
  const { user, loading } = useAuth();
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

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
      return;
    }

    if (!loading && user) {
      loadPayments();
    }
  }, [loading, user, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const method = params.get('payment_method');
    const status = params.get('status');
    if (method) setPaymentMethodFilter(method.toUpperCase());
    if (status) setStatusFilter(status.toUpperCase());
  }, []);

  const loadPayments = async () => {
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
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load landlord payments.');
    } finally {
      setIsLoading(false);
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
    return <div className="min-h-screen bg-slate-50 p-8">Loading data...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Landlord Payments</h1>
            <p className="mt-3 text-sm text-slate-600">Review tenant rent collections, outstanding balances, and payment status.</p>
          </div>
          <button
            onClick={() => router.push('/landlord')}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Back to dashboard
          </button>
        </div>

        <section className="mt-8 rounded-3xl bg-slate-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Payment filters</h2>
              <p className="mt-2 text-sm text-slate-500">Filter the payment ledger by status and month.</p>
            </div>
            <button
              onClick={loadPayments}
              disabled={isLoading}
              className="rounded-2xl bg-brand-red px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Refresh
            </button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <select
              value={paymentMethodFilter}
              onChange={(event) => setPaymentMethodFilter(event.target.value)}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
            >
              <option value="">All methods</option>
              <option value="DIRECT">Direct</option>
              <option value="EFT">EFT</option>
              <option value="CARD">Card</option>
              <option value="MOBILE_MONEY">Mobile money</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
            >
              <option value="">All statuses</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="OVERDUE">Overdue</option>
              <option value="FAILED">Failed</option>
              <option value="PROCESSING">Processing</option>
            </select>
            <input
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
              placeholder="YYYY-MM"
            />
            <button
              onClick={loadPayments}
              disabled={isLoading}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Apply filters
            </button>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Payment summary</h2>
          <p className="mt-2 text-sm text-slate-500">A quick overview of collection performance for your portfolio.</p>
          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
          {actionMessage ? <p className="mt-4 text-sm text-emerald-700">{actionMessage}</p> : null}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Total expected</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">N${Number(summary?.total_expected || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Collected</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">N${Number(summary?.total_collected || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Outstanding</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">N${Number(summary?.outstanding || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Collection rate</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{summary?.collection_rate ?? 0}%</p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Recent payments</h2>
          <p className="mt-2 text-sm text-slate-500">Latest landlord-side payment entries pulled from backend records.</p>
          <div className="mt-5 space-y-4">
            {isLoading ? (
              <p className="text-sm text-slate-500">Loading data...</p>
            ) : payments.length ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Unit</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Due</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment: any) => {
                      const requiresDirectConfirm = payment.payment_method === 'DIRECT' && payment.status === 'PENDING';
                      return (
                        <tr
                          key={payment.id}
                          className={`border-t border-slate-100 ${requiresDirectConfirm ? 'bg-amber-50' : ''}`}
                        >
                          <td className="px-4 py-3">{payment.property || 'Unknown unit'}</td>
                          <td className="px-4 py-3">{payment.payment_method || 'N/A'}</td>
                          <td className="px-4 py-3 font-semibold">N${Number(payment.amount_gross || payment.amount || 0).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">{payment.due_date ? new Date(payment.due_date).toLocaleDateString() : '—'}</td>
                          <td className="relative px-4 py-3">
                            {requiresDirectConfirm ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmPopover({
                                      id: payment.id,
                                      received_date: new Date().toISOString().slice(0, 10),
                                      amount: String(payment.amount_gross || payment.amount || ''),
                                    })
                                  }
                                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white"
                                >
                                  Mark as Received
                                </button>
                                {confirmPopover?.id === payment.id ? (
                                  <div className="absolute right-0 top-10 z-20 w-64 rounded-xl border border-amber-200 bg-white p-3 shadow-lg">
                                    <label className="text-xs text-slate-600">Date received</label>
                                    <input
                                      type="date"
                                      value={confirmPopover?.received_date ?? ''}
                                      onChange={(event) =>
                                        setConfirmPopover((prev) =>
                                          prev ? { ...prev, received_date: event.target.value } : prev,
                                        )
                                      }
                                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                                    />
                                    <label className="mt-2 block text-xs text-slate-600">Amount</label>
                                    <input
                                      type="number"
                                      value={confirmPopover?.amount ?? ''}
                                      onChange={(event) =>
                                        setConfirmPopover((prev) =>
                                          prev ? { ...prev, amount: event.target.value } : prev,
                                        )
                                      }
                                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                                    />
                                    <div className="mt-3 flex justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setConfirmPopover(null)}
                                        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await handleConfirmPayment(
                                            payment.id,
                                            confirmPopover?.received_date,
                                            confirmPopover?.amount,
                                          );
                                          setConfirmPopover(null);
                                        }}
                                        disabled={confirmingId === payment.id}
                                        className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white"
                                      >
                                        Confirm
                                      </button>
                                    </div>
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
              <p className="text-sm text-slate-500">No payment transactions found for the selected filters.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
