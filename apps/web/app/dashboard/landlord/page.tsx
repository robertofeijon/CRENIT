'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';

export default function LandlordDashboard() {
  const { user, loading, role } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [switchRequests, setSwitchRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role && role !== 'LANDLORD' && role !== 'ADMIN') router.replace('/tenant/home');
  }, [loading, user, role, router]);

  useEffect(() => {
    if (user && (role === 'LANDLORD' || role === 'ADMIN')) loadOverview();
    if (user && (role === 'LANDLORD' || role === 'ADMIN')) loadNotifications();
    if (user && (role === 'LANDLORD' || role === 'ADMIN')) loadSwitchRequests();
  }, [user, role]);

  const loadOverview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/landlords/overview');
      setDashboard(res.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load overview.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await api.get('/notifications/unread');
      setNotifications(res.data?.data || []);
    } catch {
      setNotifications([]);
    }
  };

  const loadSwitchRequests = async () => {
    try {
      const res = await api.get('/landlords/lease/payment-method-switch/requests');
      setSwitchRequests(res.data?.data || []);
    } catch {
      setSwitchRequests([]);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // Keep non-blocking in dashboard.
    }
  };

  if (loading || !user) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  const stats = dashboard?.stats ?? {};
  const hasDirectLease = (dashboard?.tenants ?? []).some((tenant: any) => tenant.payment_method === 'DIRECT');
  const pendingApproval = (dashboard?.landlord?.partnerStatus || '').toUpperCase() === 'PENDING_APPROVAL';
  const formatMoney = (v: unknown) => `N$${Number(v || 0).toLocaleString()}`;

  return (
    <div>
      <PageHeader
        title="Portfolio overview"
        subtitle="Live metrics from your properties, tenants, and payments."
        actions={
          <button type="button" onClick={loadOverview} disabled={isLoading} className="rc-btn-outline">
            {isLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      {pendingApproval ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Your landlord account is under review. You&apos;ll be notified once approved.
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Properties" value={stats.totalProperties ?? '—'} icon="🏠" />
        <StatCard label="Active tenants" value={stats.activeTenants ?? '—'} icon="👥" />
        <StatCard label="Monthly rent expected" value={formatMoney(stats.monthlyRentExpected)} icon="📅" />
        <StatCard label="Collected this month" value={formatMoney(stats.collectedThisMonth)} icon="✅" />
        <StatCard label="Outstanding balance" value={formatMoney(stats.outstanding)} icon="⏳" />
        <StatCard label="Commission earned" value={formatMoney(stats.commissionEarnedThisMonth)} icon="💰" />
      </div>

      {(stats.awaitingDirectConfirmations || 0) > 0 ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-amber-900">
              Awaiting Confirmation — {stats.awaitingDirectConfirmations} direct payments need your confirmation.
            </p>
            <Link
              href="/landlord/payments?payment_method=DIRECT&status=PENDING"
              className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Review now
            </Link>
          </div>
        </div>
      ) : null}

      {hasDirectLease ? (
        <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-sm text-indigo-900">
            Direct leases require manual confirmation. Switch to platform payments for instant score updates.
          </p>
          <Link href="/landlord/leases" className="mt-2 inline-flex rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white">
            Request Switch
          </Link>
        </div>
      ) : null}

      {switchRequests.length ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-900">Payment method switch requests</p>
          <div className="mt-2 space-y-2">
            {switchRequests.map((req: any) => (
              <div key={req.id} className="rounded-lg bg-white px-3 py-2 text-xs text-slate-700">
                Lease {req.lease_id}: switch to {req.requested_method}.{' '}
                {!req.landlord_confirmed ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await api.post('/landlords/lease/payment-method-switch/confirm', { request_id: req.id });
                      await loadSwitchRequests();
                    }}
                    className="rounded bg-emerald-700 px-2 py-1 font-semibold text-white"
                  >
                    Confirm switch
                  </button>
                ) : (
                  <span>Awaiting tenant confirmation.</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="rc-card lg:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Partner status</h2>
              <p className="mt-1 text-sm text-gray-500">{dashboard?.landlord?.businessName ?? '—'}</p>
            </div>
            <Badge variant="navy">{dashboard?.landlord?.partnerStatus ?? 'UNKNOWN'}</Badge>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Deposits: {dashboard?.depositSummary?.totalDeposits ?? 0} total · {dashboard?.depositSummary?.held ?? 0} held ·{' '}
            {dashboard?.depositSummary?.disputed ?? 0} disputed · {dashboard?.depositSummary?.refunded ?? 0} refunded
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href={pendingApproval ? '/landlord/onboarding' : '/landlord/tenants'} className="rc-btn-navy">
              Go to tenant review
            </Link>
            <Link href={pendingApproval ? '/landlord/onboarding' : '/landlord/payments'} className="rc-btn-outline">
              View payments
            </Link>
            <Link href={pendingApproval ? '/landlord/onboarding' : '/landlord/deposits'} className="rc-btn-outline">
              Manage deposits
            </Link>
          </div>
        </div>

        <div className="rc-card lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900">Quick actions</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {[
              { label: 'Invite tenant', href: '/landlord/tenants' },
              { label: 'Record deposit', href: '/landlord/deposits' },
              { label: 'Generate report', href: '/landlord/reports' },
              { label: 'View payment history', href: '/landlord/payments' },
            ].map((item) => (
              <li key={item.href}>
                <Link href={pendingApproval ? '/landlord/onboarding' : item.href} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 font-medium text-gray-800 hover:bg-gray-100">
                  {item.label}
                  <span>→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 rc-card">
        <h2 className="text-lg font-semibold text-gray-900">Recent payments</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                <th className="py-3 pr-4">Method</th>
                <th className="py-3 pr-4">Amount</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {(dashboard?.recentPayments ?? []).slice(0, 8).map((payment: any) => (
                <tr key={payment.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3">{payment.payment_method || '—'}</td>
                  <td className="py-3 font-medium">{formatMoney(payment.amount_gross)}</td>
                  <td className="py-3">
                    <Badge variant={payment.status === 'PAID' ? 'success' : payment.status === 'OVERDUE' ? 'error' : 'warning'}>
                      {payment.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-gray-500">
                    {payment.paid_date ? new Date(payment.paid_date).toLocaleDateString() : 'Pending'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!dashboard?.recentPayments?.length ? <p className="py-4 text-sm text-gray-500">No payments yet.</p> : null}
        </div>
      </div>

      <div className="mt-6 rc-card">
        <h2 className="text-lg font-semibold text-gray-900">Unread notifications</h2>
        <ul className="mt-4 space-y-3">
          {notifications.slice(0, 6).map((note: any) => (
            <li key={note.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{note.title}</p>
                  <p className="mt-1 text-sm text-gray-600">{note.message}</p>
                  <p className="mt-1 text-xs text-gray-400">{new Date(note.created_at).toLocaleString()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => markNotificationRead(note.id)}
                  className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700"
                >
                  Dismiss
                </button>
              </div>
            </li>
          ))}
          {!notifications.length ? <li className="text-sm text-gray-500">No unread notifications.</li> : null}
        </ul>
      </div>
    </div>
  );
}

