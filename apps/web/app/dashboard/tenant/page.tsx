"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';

type PaymentRecord = {
  id: string;
  amount_gross?: number;
  due_date?: string;
  paid_date?: string;
  payment_method?: string;
  status?: string;
};

type DashboardData = {
  activeLease?: {
    id: string;
    monthly_rent?: number;
    start_date: string;
    units?: { unit_identifier?: string };
  };
  upcomingPayments?: PaymentRecord[];
  score?: { score?: number; tier?: string };
  deposit?: { status?: string; amount?: number };
  profile?: { kyc_status?: string; income_monthly?: number; full_name?: string };
  latestReport?: { storage_path?: string; generated_at?: string };
  recentPayments?: PaymentRecord[];
};

type AutoPayStatus = {
  auto_pay_enabled?: boolean;
  next_payment?: string;
};

const getErrorMessage = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return 'An unexpected error occurred.';
  }

  if ('message' in error && typeof error.message === 'string') {
    return error.message;
  }

  if ('response' in error && typeof error.response === 'object' && error.response) {
    const response = error.response as Record<string, unknown>;
    if ('data' in response && typeof response.data === 'object' && response.data) {
      const data = response.data as Record<string, unknown>;
      if ('message' in data && typeof data.message === 'string') {
        return data.message;
      }
    }
  }

  return 'An unexpected error occurred.';
};

export default function TenantDashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [fullHistory, setFullHistory] = useState<PaymentRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [autoPayStatus, setAutoPayStatus] = useState<AutoPayStatus | null>(null);
  const [autoPayLoading, setAutoPayLoading] = useState(false);
  const [autoPayError, setAutoPayError] = useState<string | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [payDayOffset, setPayDayOffset] = useState('1');
  const [receiptLoadingId, setReceiptLoadingId] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const role = user ? ((user.user_metadata as Record<string, unknown>)?.role as string)?.toUpperCase() : null;
  const isLandlord = role === 'LANDLORD';

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
      return;
    }

    if (!loading && user && !isLandlord) {
      loadDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, isLandlord, router]);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.get('/tenants/me');
      setDashboard(res.data.data as DashboardData);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Unable to load tenant dashboard.');
    } finally {
      setIsLoading(false);
    }

    await loadAutoPayStatus();
  };

  const loadAutoPayStatus = async () => {
    setAutoPayLoading(true);
    setAutoPayError(null);

    try {
      const response = await api.get('/payments/upcoming');
      setAutoPayStatus(response.data.data as AutoPayStatus);
    } catch (err: unknown) {
      setAutoPayError(getErrorMessage(err) || 'Unable to load auto-pay status.');
    } finally {
      setAutoPayLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!dashboard?.activeLease) {
      setError('No active lease available to record a payment.');
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      await api.post('/payments/record', {
        tenant_id: user?.id,
        lease_id: dashboard.activeLease.id,
        amount: dashboard.activeLease.monthly_rent,
        payment_method: 'ONLINE',
      });
      await loadDashboard();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Unable to record payment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    setReportLoading(true);
    setReportError(null);

    try {
      const response = await api.get('/reports/tenant/download', { responseType: 'blob' });
      const fileBlob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(fileBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'rentcredit-tenant-report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setReportError(getErrorMessage(err) || 'Unable to download report.');
    } finally {
      setReportLoading(false);
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
    } catch (err: unknown) {
      setReceiptError(getErrorMessage(err) || 'Unable to download receipt.');
    } finally {
      setReceiptLoadingId(null);
    }
  };

  const handleSetupAutoPay = async () => {
    if (!paymentMethodId) {
      setAutoPayError('A payment method identifier is required to enable auto-pay.');
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
    } catch (err: unknown) {
      setAutoPayError(getErrorMessage(err) || 'Unable to enable auto-pay.');
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
    } catch (err: unknown) {
      setAutoPayError(getErrorMessage(err) || 'Unable to cancel auto-pay.');
    } finally {
      setAutoPayLoading(false);
    }
  };

  const togglePaymentHistory = async () => {
    if (fullHistory.length) {
      setFullHistory([]);
      return;
    }

    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const res = await api.get('/tenants/payments');
      setFullHistory(res.data.data || []);
    } catch (err: unknown) {
      setHistoryError(getErrorMessage(err) || 'Unable to load payment history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/auth');
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 p-8">Loading authentication...</div>;
  }

  if (!user) {
    return null;
  }

  if (isLandlord) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-4">Unauthorized</h2>
          <p className="mb-6 text-sm text-slate-600">
            Your account is registered as a landlord, so you cannot access the tenant dashboard.
          </p>
          <button
            onClick={() => router.push('/landlord')}
            className="rounded bg-brand-red px-5 py-3 text-white"
          >
            Go to Landlord Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl p-8">
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Tenant dashboard</p>
              <h1 className="mt-3 text-3xl font-bold text-slate-900">Welcome back, {user.email ?? 'Tenant'}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Track rent, deposit status, credit score history, and your latest report from the backend.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Snapshot</h2>
                <p className="mt-2 text-sm text-slate-500">Your current rent and credit health in one view.</p>
              </div>
              <button
                onClick={loadDashboard}
                disabled={isLoading}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Refresh
              </button>
            </div>

            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Next payment</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">
                    {dashboard?.upcomingPayments?.[0]
                      ? `N$${Number(dashboard.upcomingPayments[0].amount_gross).toLocaleString()}`
                      : 'N$0'}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {dashboard?.upcomingPayments?.[0]
                      ? `Due ${new Date(dashboard.upcomingPayments[0].due_date).toLocaleDateString()}`
                      : 'No upcoming rent scheduled.'}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Credit score</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">
                    {dashboard?.score?.score ?? '—'}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">{dashboard?.score?.tier ?? 'No score yet'}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Deposit status</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">{dashboard?.deposit?.status ?? 'No deposit recorded'}</p>
                  {dashboard?.deposit?.amount != null && (
                    <p className="mt-2 text-sm text-slate-600">Amount held: N${Number(dashboard.deposit.amount).toLocaleString()}</p>
                  )}
                </div>
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">KYC status</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">{dashboard?.profile?.kyc_status ?? 'NOT_SUBMITTED'}</p>
                  <p className="mt-2 text-sm text-slate-600">{dashboard?.profile?.income_monthly ? `Income N$${Number(dashboard.profile.income_monthly).toLocaleString()}/month` : 'Income not submitted'}</p>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Latest report</h2>
            <p className="mt-2 text-sm text-slate-500">Your most recent credit file and score snapshot.</p>
            <div className="mt-6 rounded-3xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Report status</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{dashboard?.latestReport?.storage_path ? 'Generated' : 'Not yet available'}</p>
              {dashboard?.latestReport?.generated_at && (
                <p className="mt-2 text-sm text-slate-600">Generated {new Date(dashboard.latestReport.generated_at).toLocaleDateString()}</p>
              )}
              <button
                onClick={handleDownloadReport}
                disabled={reportLoading}
                className="mt-4 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reportLoading ? 'Generating report...' : 'Download report'}
              </button>
              {reportError ? <p className="mt-3 text-sm text-red-600">{reportError}</p> : null}
            </div>
          </section>
        </div>

        <div className="grid gap-6 mt-6 xl:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Active lease</h2>
            <p className="mt-2 text-sm text-slate-500">Your current housing agreement and rent details.</p>
            {dashboard?.activeLease ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Unit</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{dashboard.activeLease.units?.unit_identifier || 'Unknown'}</p>
                  <p className="mt-2 text-sm text-slate-600">Rent: N${Number(dashboard.activeLease.monthly_rent || 0).toLocaleString()} / month</p>
                  <p className="mt-2 text-sm text-slate-600">Lease start: {new Date(dashboard.activeLease.start_date).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={handleRecordPayment}
                  disabled={actionLoading}
                  className="rounded-2xl bg-brand-red px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? 'Recording payment...' : 'Pay rent'}
                </button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No active lease found for this account.</p>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Upcoming payments</h2>
            <p className="mt-2 text-sm text-slate-500">Your next rent due dates.</p>
            <div className="mt-5 space-y-3">
              {dashboard?.upcomingPayments?.length ? (
                dashboard.upcomingPayments.map((payment: PaymentRecord) => (
                  <div key={payment.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">{payment.payment_method || 'SIMULATED'}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">N${Number(payment.amount_gross || 0).toLocaleString()}</p>
                    <p className="mt-2 text-sm text-slate-600">Due {new Date(payment.due_date).toLocaleDateString()}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No upcoming rent due.</p>
              )}
            </div>
            <div className="mt-6 rounded-3xl bg-slate-50 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Manage payments</p>
              <div className="mt-4 space-y-3">
                <button
                  onClick={() => router.push('/tenant/payments')}
                  className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  View payment history
                </button>
                <button
                  onClick={() => router.push('/tenant/deposit')}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Review deposit and disputes
                </button>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Payment history</h2>
              <p className="mt-2 text-sm text-slate-500">Most recent payment transactions recorded in the backend.</p>
            </div>
            <button
              onClick={togglePaymentHistory}
              disabled={historyLoading}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {fullHistory.length ? 'Hide full history' : historyLoading ? 'Loading...' : 'Load full history'}
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {historyError ? (
              <p className="text-sm text-red-600">{historyError}</p>
            ) : (fullHistory.length ? fullHistory : dashboard?.recentPayments || []).length ? (
              (fullHistory.length ? fullHistory : dashboard?.recentPayments).map((payment: PaymentRecord) => (
                <div key={payment.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{payment.payment_method || 'SIMULATED'}</p>
                      <p className="mt-1 font-semibold text-slate-900">N${Number(payment.amount_gross || 0).toLocaleString()}</p>
                      <p className="mt-2 text-sm text-slate-600">Paid: {payment.paid_date ? new Date(payment.paid_date).toLocaleDateString() : 'Pending'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
                        {payment.status}
                      </span>
                      {payment.id ? (
                        <button
                          onClick={() => handleDownloadReceipt(payment.id)}
                          disabled={receiptLoadingId === payment.id}
                          className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {receiptLoadingId === payment.id ? 'Downloading...' : 'Download receipt'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No payments have been recorded yet.</p>
            )}
            {receiptError ? <p className="text-sm text-red-600">{receiptError}</p> : null}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Auto-pay settings</h2>
          <p className="mt-2 text-sm text-slate-500">Manage recurring rent payments directly from your tenant dashboard.</p>
          <div className="mt-6 rounded-3xl bg-slate-50 p-6">
            <p className="text-sm text-slate-500">Auto-pay status</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{autoPayStatus ? (autoPayStatus.auto_pay_enabled ? 'Enabled' : 'Disabled') : 'Loading...'}</p>
            {autoPayStatus?.next_payment && (
              <p className="mt-2 text-sm text-slate-600">Next scheduled payment: {new Date(autoPayStatus.next_payment).toLocaleDateString()}</p>
            )}
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Payment method ID</label>
                <input
                  value={paymentMethodId}
                  onChange={(event) => setPaymentMethodId(event.target.value)}
                  placeholder="Existing payment method ID"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Pay day offset</label>
                <input
                  value={payDayOffset}
                  onChange={(event) => setPayDayOffset(event.target.value)}
                  placeholder="1"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleSetupAutoPay}
                  disabled={autoPayLoading}
                  className="rounded-2xl bg-brand-red px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {autoPayLoading ? 'Saving...' : 'Enable auto-pay'}
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

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Settings</h2>
          <p className="mt-2 text-sm text-slate-500">Your tenant account information and current profile settings.</p>
          <div className="mt-6 space-y-4 rounded-3xl bg-slate-50 p-5">
            <div>
              <p className="text-sm text-slate-500">Name</p>
              <p className="mt-1 text-slate-900">{dashboard?.profile?.full_name ?? 'Not available'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="mt-1 text-slate-900">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">KYC status</p>
              <p className="mt-1 text-slate-900">{dashboard?.profile?.kyc_status ?? 'NOT_SUBMITTED'}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
