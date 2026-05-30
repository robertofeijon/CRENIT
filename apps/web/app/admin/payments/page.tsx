'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, RefreshCw, Wallet } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import AdminPageHeader from '../../components/ui/AdminPageHeader';
import AdminStatCard from '../../components/ui/AdminStatCard';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';

export default function AdminPaymentsPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  const loadPayments = useCallback(() => {
    setIsLoading(true);
    setError(null);
    api
      .get('/admin/payments', { params: { limit: 40, payment_method: paymentMethodFilter || undefined } })
      .then((res) => {
        setPayments(res.data.data.payments || []);
        setSummary(res.data.data.summary || null);
        setTotal(res.data.data.total ?? res.data.data.payments?.length ?? 0);
      })
      .catch((err: any) => setError(err?.response?.data?.message || err?.message || 'Unable to load payments.'))
      .finally(() => setIsLoading(false));
  }, [paymentMethodFilter]);

  useEffect(() => {
    if (user && role === 'ADMIN') {
      loadPayments();
    }
  }, [user, role, loadPayments]);

  if (loading || !user || role !== 'ADMIN') {
    return <p className="text-sm text-slate-500">Loading admin workspace...</p>;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        badge="Finance"
        title="Payment oversight"
        subtitle="Live payment records — gross volume and settlement status. CRENIT revenue is monthly data-recording fees, not rent commissions."
        actions={
          <button
            type="button"
            onClick={() => loadPayments()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A] transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        }
      />

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Payment method</label>
        <select
          value={paymentMethodFilter}
          onChange={(event) => setPaymentMethodFilter(event.target.value)}
          className="w-full max-w-xs rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#C0392B]/60"
        >
          <option value="">All methods</option>
          <option value="CARD">Card (platform)</option>
          <option value="EFT">EFT (direct)</option>
        </select>
      </div>

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard
            label="Gross volume"
            value={`N$${Number(summary.total_gross || 0).toLocaleString()}`}
            sub="Current page batch"
            icon={Wallet}
          />
          <AdminStatCard
            label="Legacy commission field"
            value={`N$${Number(summary.total_commission || 0).toLocaleString()}`}
            sub="CRENIT bills monthly data-recording fees separately"
            icon={CreditCard}
            accent="dark"
          />
          <AdminStatCard label="Paid" value={summary.paid ?? 0} accent="success" />
          <AdminStatCard label="Pending" value={summary.pending ?? 0} accent="warning" />
        </div>
      ) : null}

      {error ? <ErrorStateCard message={error} onRetry={loadPayments} /> : null}

      <p className="text-sm text-slate-600">
        Showing <strong>{payments.length}</strong> of <strong>{total}</strong> payments
      </p>

      {isLoading ? (
        <SkeletonBlocks rows={4} />
      ) : payments.length ? (
        <div className="space-y-3">
          {payments.map((payment) => (
            <article
              key={payment.id}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-lg font-semibold text-[#1A1A1A]">
                  N${Number(payment.amount_gross || 0).toLocaleString()}
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                    payment.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {payment.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Commission N${Number(payment.commission_amount || 0).toLocaleString()} · Net N$
                {Number(payment.amount_net || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {payment.payment_method || '—'} ·{' '}
                {payment.paid_date ? new Date(payment.paid_date).toLocaleString() : 'Unpaid'}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyStateCard
          title="No payments found"
          description="Run supabase/seed.sql or npm run seed:demo to create sample payment history."
        />
      )}
    </div>
  );
}
