'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Download, RefreshCw, Wallet } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import TenantPageHeader from '../../components/ui/TenantPageHeader';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import { formatN$, statusPillClass, tenantInputClass, tenantSelectClass } from '../../components/tenant/tenantUi';

export default function TenantPaymentsPage() {
  const { user, loading, roleReady } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentEvents, setPaymentEvents] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any>(null);
  const [leaseContext, setLeaseContext] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [receiptLoadingId, setReceiptLoadingId] = useState<string | null>(null);
  const [autoPayStatus, setAutoPayStatus] = useState<any>(null);
  const [autoPayLoading, setAutoPayLoading] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [payDayOffset, setPayDayOffset] = useState('1');
  const [payMethod, setPayMethod] = useState<'EFT' | 'CARD' | 'MOBILE_MONEY'>('EFT');
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    if (!loading && roleReady && !user) router.replace('/auth');
    if (!loading && roleReady && user) void loadAll();
  }, [loading, roleReady, user, router]);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [historyRes, upcomingRes, meRes] = await Promise.all([
        api.get('/payments/history?limit=50'),
        api.get('/payments/upcoming'),
        api.get('/tenants/me'),
      ]);
      setPayments(historyRes.data.data?.payments || []);
      setPaymentEvents(historyRes.data.data?.payment_events || []);
      setUpcoming(upcomingRes.data.data);
      setAutoPayStatus(upcomingRes.data.data);
      setLeaseContext(meRes.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load payments.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDownloadReceipt = async (paymentId: string) => {
    setReceiptLoadingId(paymentId);
    try {
      const response = await api.get(`/payments/receipt/${paymentId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `crenit-receipt-${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to download receipt.');
    } finally {
      setReceiptLoadingId(null);
    }
  };

  const handlePayNow = async () => {
    const unitId = leaseContext?.activeLease?.unit_id;
    const amount = Number(upcoming?.next_payment?.amount || leaseContext?.activeLease?.monthly_rent);
    if (!unitId || !amount) {
      setError('No active lease found. Contact your landlord to link your account.');
      return;
    }
    setPayLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.post('/payments/initiate', {
        property_unit_id: unitId,
        lease_id: leaseContext?.activeLease?.id,
        amount,
        payment_method: payMethod,
        payment_details: payMethod === 'MOBILE_MONEY' ? { provider: 'MTC' } : {},
      });
      setMessage(res.data?.data?.message || 'Payment initiated successfully.');
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to initiate payment.');
    } finally {
      setPayLoading(false);
    }
  };

  const handleSetupAutoPay = async () => {
    if (!paymentMethodId) {
      setError('Add a payment method in Settings first, then paste its ID here.');
      return;
    }
    setAutoPayLoading(true);
    try {
      await api.post('/payments/auto-pay/setup', {
        enabled: true,
        payment_method_id: paymentMethodId,
        pay_day_offset: Number(payDayOffset) || 1,
      });
      setMessage('Auto-pay enabled.');
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to enable auto-pay.');
    } finally {
      setAutoPayLoading(false);
    }
  };

  const handleCancelAutoPay = async () => {
    setAutoPayLoading(true);
    try {
      await api.post('/payments/auto-pay/cancel');
      setMessage('Auto-pay cancelled.');
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to cancel auto-pay.');
    } finally {
      setAutoPayLoading(false);
    }
  };

  if (loading || !roleReady || !user) {
    return <p className="text-sm text-slate-500">Loading tenant workspace…</p>;
  }

  const next = upcoming?.next_payment;

  return (
    <div className="space-y-6">
      <TenantPageHeader
        badge="Rent"
        title="Pay rent"
        subtitle="Pay upcoming rent, review history, download receipts, and manage auto-pay."
        actions={
          <button type="button" onClick={() => void loadAll()} disabled={isLoading} className="tenant-btn-secondary">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        }
      />

      {error ? <ErrorStateCard message={error} onRetry={() => void loadAll()} /> : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="tenant-panel">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-[#C0392B]" aria-hidden />
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Upcoming payment</h2>
          </div>
          {isLoading && !next ? (
            <SkeletonBlocks rows={2} />
          ) : next ? (
            <>
              <p className="mt-4 text-3xl font-semibold tabular-nums text-[#1A1A1A]">{formatN$(next.amount)}</p>
              <p className="mt-1 text-sm text-slate-600">
                Due {next.due_date}
                {next.days_until_due != null ? ` · ${next.days_until_due} day(s) away` : ''}
              </p>
              <div className="mt-4 space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Payment method</label>
                <select className={tenantSelectClass} value={payMethod} onChange={(e) => setPayMethod(e.target.value as typeof payMethod)}>
                  <option value="EFT">Bank transfer (EFT)</option>
                  <option value="CARD">Card</option>
                  <option value="MOBILE_MONEY">Mobile money</option>
                </select>
                <button type="button" className="tenant-btn-primary w-full" disabled={payLoading} onClick={() => void handlePayNow()}>
                  {payLoading ? 'Processing…' : 'Pay now'}
                </button>
              </div>
            </>
          ) : (
            <EmptyStateCard title="No upcoming rent" description="Your landlord will schedule rent when your lease is active." />
          )}
        </section>

        <section className="tenant-panel">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[#C0392B]" aria-hidden />
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Auto-pay</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Status: <strong>{autoPayStatus?.auto_pay_enabled ? 'Enabled' : 'Disabled'}</strong>
          </p>
          <div className="mt-4 space-y-3">
            <input
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
              className={tenantInputClass}
              placeholder="Payment method ID (from Settings)"
            />
            <input
              value={payDayOffset}
              onChange={(e) => setPayDayOffset(e.target.value)}
              className={tenantInputClass}
              placeholder="Days before due date"
              type="number"
              min={0}
              max={7}
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="tenant-btn-primary" disabled={autoPayLoading} onClick={() => void handleSetupAutoPay()}>
                Enable auto-pay
              </button>
              <button
                type="button"
                className="tenant-btn-secondary"
                disabled={autoPayLoading || !autoPayStatus?.auto_pay_enabled}
                onClick={() => void handleCancelAutoPay()}
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="tenant-panel">
        <h2 className="text-lg font-semibold text-[#1A1A1A]">Payment history</h2>
        {isLoading ? (
          <div className="mt-4">
            <SkeletonBlocks rows={3} />
          </div>
        ) : payments.length ? (
          <div className="mt-4 space-y-3">
            {payments.map((payment) => (
              <div key={payment.id} className="flex flex-col gap-3 rounded-xl bg-[#F3F4F6] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-500">{payment.payment_method || '—'}</p>
                  <p className="text-lg font-semibold text-[#1A1A1A]">{formatN$(payment.amount_gross)}</p>
                  <p className="text-sm text-slate-600">
                    {payment.paid_date ? `Paid ${new Date(payment.paid_date).toLocaleDateString()}` : `Due ${payment.due_date}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusPillClass(payment.status)}`}>{payment.status}</span>
                  {payment.status === 'PAID' && payment.id ? (
                    <button
                      type="button"
                      className="tenant-btn-secondary px-3 py-1.5 text-xs"
                      disabled={receiptLoadingId === payment.id}
                      onClick={() => void handleDownloadReceipt(payment.id)}
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden />
                      {receiptLoadingId === payment.id ? '…' : 'Receipt'}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyStateCard title="No payments yet" description="Your rent payments will appear here once recorded." />
          </div>
        )}
        {paymentEvents.length ? (
          <div className="mt-6 rounded-xl border border-slate-100 bg-[#F3F4F6] p-4">
            <p className="text-sm font-semibold text-[#1A1A1A]">Recent events</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {paymentEvents.slice(0, 5).map((event) => (
                <li key={event.id}>
                  {event.payment_status} · {event.payment_method || 'N/A'} ·{' '}
                  {event.created_at ? new Date(event.created_at).toLocaleString() : ''}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
