"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';

export default function AdminPaymentsPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');

  const loadPayments = () => {
    setIsLoading(true);
    api
      .get('/admin/payments', { params: { limit: 40, payment_method: paymentMethodFilter || undefined } })
      .then((res) => {
        setPayments(res.data.data.payments || []);
        setSummary(res.data.data.summary || null);
      })
      .catch((err: any) => setError(err?.response?.data?.message || err?.message || 'Unable to load payments.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  useEffect(() => {
    if (user && role === 'ADMIN') {
      loadPayments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role, paymentMethodFilter]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-bold text-slate-900">Payment oversight</h1>
      <p className="mt-3 text-sm text-slate-600">Transaction log and commission reconciliation.</p>
      <div className="mt-4 flex items-center gap-2">
        <select
          value={paymentMethodFilter}
          onChange={(event) => setPaymentMethodFilter(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All payment methods</option>
          <option value="PLATFORM">Platform</option>
          <option value="DIRECT">Direct</option>
        </select>
      </div>
      {error ? <div className="mt-4"><ErrorStateCard message={error} onRetry={() => router.refresh()} /></div> : null}
      {summary ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm">
            <p className="text-slate-500">Gross</p>
            <p className="mt-1 font-semibold">N${Number(summary.total_gross || 0).toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm">
            <p className="text-slate-500">Commission</p>
            <p className="mt-1 font-semibold">N${Number(summary.total_commission || 0).toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm">
            <p className="text-slate-500">Paid</p>
            <p className="mt-1 font-semibold">{summary.paid}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm">
            <p className="text-slate-500">Pending</p>
            <p className="mt-1 font-semibold">{summary.pending}</p>
          </div>
        </div>
      ) : null}
      {isLoading ? (
        <div className="mt-6">
          <SkeletonBlocks rows={4} />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {payments.map((payment) => (
            <div key={payment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-semibold text-slate-900">N${Number(payment.amount_gross || 0).toLocaleString()}</p>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold uppercase">{payment.status}</span>
              </div>
              <p className="mt-2 text-slate-600">Commission: N${Number(payment.commission_amount || 0).toLocaleString()} · Net: N${Number(payment.amount_net || 0).toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-500">{payment.payment_method} · {payment.paid_date ? new Date(payment.paid_date).toLocaleString() : 'Unpaid'}</p>
            </div>
          ))}
          {!payments.length ? (
            <EmptyStateCard title="No payments available" description="There are no payment records for the selected range." />
          ) : null}
        </div>
      )}
    </div>
  );
}
