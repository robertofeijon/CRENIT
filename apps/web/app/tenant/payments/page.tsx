"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function TenantPaymentsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptLoadingId, setReceiptLoadingId] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [autoPayStatus, setAutoPayStatus] = useState<any>(null);
  const [autoPayLoading, setAutoPayLoading] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [payDayOffset, setPayDayOffset] = useState('1');
  const [autoPayError, setAutoPayError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
      return;
    }

    if (!loading && user) {
      loadPayments();
      loadAutoPayStatus();
    }
  }, [loading, user, router]);

  const loadPayments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get('/payments/history?limit=50');
      setPayments(response.data.data?.payments || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load payment history.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAutoPayStatus = async () => {
    setAutoPayLoading(true);
    setAutoPayError(null);

    try {
      const response = await api.get('/payments/upcoming');
      setAutoPayStatus(response.data.data);
    } catch (err: any) {
      setAutoPayError(err?.response?.data?.message || err?.message || 'Unable to load auto-pay status.');
    } finally {
      setAutoPayLoading(false);
    }
  };

  const handleDownloadReceipt = async (paymentId: string) => {
    setReceiptLoadingId(paymentId);
    setReceiptError(null);

    try {
      const response = await api.get(`/payments/receipt/${paymentId}`, { responseType: 'blob' });
      const fileBlob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(fileBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rentcredit-receipt-${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setReceiptError(err?.response?.data?.message || err?.message || 'Unable to download receipt.');
    } finally {
      setReceiptLoadingId(null);
    }
  };

  const handleSetupAutoPay = async () => {
    if (!paymentMethodId) {
      setAutoPayError('Payment method ID is required to enable auto-pay.');
      return;
    }

    setAutoPayLoading(true);
    setAutoPayError(null);

    try {
      await api.post('/payments/auto-pay/setup', {
        enabled: true,
        payment_method_id: paymentMethodId,
        pay_day_offset: Number(payDayOffset) || 1,
      });
      await loadAutoPayStatus();
    } catch (err: any) {
      setAutoPayError(err?.response?.data?.message || err?.message || 'Unable to enable auto-pay.');
    } finally {
      setAutoPayLoading(false);
    }
  };

  const handleCancelAutoPay = async () => {
    setAutoPayLoading(true);
    setAutoPayError(null);

    try {
      await api.post('/payments/auto-pay/cancel');
      await loadAutoPayStatus();
    } catch (err: any) {
      setAutoPayError(err?.response?.data?.message || err?.message || 'Unable to cancel auto-pay.');
    } finally {
      setAutoPayLoading(false);
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-slate-50 p-8">Preparing payments...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Tenant Payments</h1>
            <p className="mt-3 text-sm text-slate-600">Track rent payments, download receipts, and manage auto-pay.</p>
          </div>
          <button
            onClick={() => router.push('/tenant')}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Back to dashboard
          </button>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Payment history</h2>
            <p className="mt-2 text-sm text-slate-500">All recorded tenant payments with downloadable receipts.</p>
            {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
            {payments.length ? (
              <div className="mt-6 space-y-4">
                {payments.map((payment) => (
                  <div key={payment.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-slate-500">{payment.payment_method || 'SIMULATED'}</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">N${Number(payment.amount_gross || 0).toLocaleString()}</p>
                        <p className="mt-2 text-sm text-slate-600">Paid: {payment.paid_date ? new Date(payment.paid_date).toLocaleDateString() : 'Pending'}</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:items-end">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
                          {payment.status}
                        </span>
                        {payment.id ? (
                          <button
                            onClick={() => handleDownloadReceipt(payment.id)}
                            disabled={receiptLoadingId === payment.id}
                            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {receiptLoadingId === payment.id ? 'Downloading...' : 'Download receipt'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-3xl bg-white p-6 text-slate-600">
                <p className="font-semibold text-slate-900">No payment records found</p>
                <p className="mt-2 text-sm">Your tenant payments will appear here once they are recorded.</p>
              </div>
            )}
            {receiptError ? <p className="mt-4 text-sm text-red-600">{receiptError}</p> : null}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Auto-pay</h2>
            <p className="mt-2 text-sm text-slate-500">Enable recurring rent collection for approved payment methods.</p>
            <div className="mt-6 space-y-4 rounded-3xl bg-slate-50 p-5">
              <p className="text-sm text-slate-600">Status: <span className="font-semibold text-slate-900">{autoPayStatus?.auto_pay_enabled ? 'Enabled' : 'Disabled'}</span></p>
              {autoPayStatus?.next_payment ? (
                <p className="text-sm text-slate-600">Next scheduled payment: {new Date(autoPayStatus.next_payment).toLocaleDateString()}</p>
              ) : null}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Payment method ID</label>
                <input
                  value={paymentMethodId}
                  onChange={(event) => setPaymentMethodId(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
                  placeholder="Existing payment method ID"
                />
                <label className="block text-sm font-medium text-slate-700">Pay day offset</label>
                <input
                  value={payDayOffset}
                  onChange={(event) => setPayDayOffset(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
                  placeholder="1"
                />
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleSetupAutoPay}
                    disabled={autoPayLoading}
                    className="rounded-2xl bg-brand-red px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {autoPayLoading ? 'Applying...' : 'Enable auto-pay'}
                  </button>
                  <button
                    onClick={handleCancelAutoPay}
                    disabled={autoPayLoading || !autoPayStatus?.auto_pay_enabled}
                    className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel auto-pay
                  </button>
                </div>
                {autoPayError ? <p className="text-sm text-red-600">{autoPayError}</p> : null}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
