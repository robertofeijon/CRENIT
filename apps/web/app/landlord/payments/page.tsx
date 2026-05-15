"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function LandlordPaymentsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
      return;
    }

    if (!loading && user) {
      loadPayments();
    }
  }, [loading, user, router]);

  const loadPayments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get('/landlords/payments', {
        params: {
          status: statusFilter || undefined,
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

  if (loading || !user) {
    return <div className="min-h-screen bg-slate-50 p-8">Preparing landlord payments...</div>;
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
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
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
              <p className="text-sm text-slate-500">Loading payments...</p>
            ) : payments.length ? (
              payments.map((payment: any) => (
                <div key={payment.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{payment.property || 'Unknown unit'}</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">N${Number(payment.amount || 0).toLocaleString()}</p>
                      <p className="mt-2 text-sm text-slate-600">Month: {payment.month || '—'}</p>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
                        {payment.status}
                      </span>
                      <p className="text-sm text-slate-600">Commission: N${Number(payment.commission || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No payment transactions found for the selected filters.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
