'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';

export default function TenantHomePage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [upcoming, setUpcoming] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [counterByRenewal, setCounterByRenewal] = useState<Record<string, { proposed_rent: string; proposed_end_date: string }>>({});
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [switchRequests, setSwitchRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role === 'LANDLORD') router.replace('/landlord');
  }, [loading, user, role, router]);

  useEffect(() => {
    if (!user || role === 'LANDLORD') return;
    setLoadingDashboard(true);
    Promise.all([
      api.get('/tenants/me'),
      api.get('/payments/upcoming').catch(() => null),
      api.get('/notifications/unread').catch(() => null),
      api.get('/tenants/renewals').catch(() => null),
      api.get('/tenants/lease/payment-method-switch/requests').catch(() => null),
    ])
      .then(([me, up, notes, renewalRes, switchRes]) => {
        setData(me.data.data);
        setUpcoming(up?.data?.data ?? null);
        setNotifications(notes?.data?.data ?? []);
        setRenewals(renewalRes?.data?.data ?? []);
        setSwitchRequests(switchRes?.data?.data ?? []);
      })
      .catch((err: any) => setError(err?.response?.data?.message || 'Unable to load dashboard data.'))
      .finally(() => setLoadingDashboard(false));
  }, [user, role]);

  const markNotificationRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // Non-blocking UI action.
    }
  };

  const respondRenewal = async (renewalId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await api.post('/tenants/renewals/respond', { renewal_id: renewalId, action });
      setRenewals((prev) =>
        prev.map((item) => (item.id === renewalId ? { ...item, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' } : item)),
      );
    } catch {
      // Keep non-blocking in dashboard.
    }
  };

  const sendCounterRenewal = async (renewalId: string) => {
    const counter = counterByRenewal[renewalId];
    if (!counter?.proposed_rent && !counter?.proposed_end_date) return;
    try {
      await api.post('/tenants/renewals/respond', {
        renewal_id: renewalId,
        action: 'COUNTER',
        proposed_rent: counter?.proposed_rent ? Number(counter.proposed_rent) : undefined,
        proposed_end_date: counter?.proposed_end_date || undefined,
      });
      setRenewals((prev) => prev.map((item) => (item.id === renewalId ? { ...item, status: 'PENDING_APPROVAL' } : item)));
    } catch {
      // Keep non-blocking in dashboard.
    }
  };

  if (loading || !user) return <p className="text-sm text-gray-500">Loading data...</p>;

  const name = data?.profile?.full_name ?? user.email?.split('@')[0] ?? 'there';
  const score = data?.score?.score ?? '—';
  const tier = data?.score?.tier ?? 'BUILDING';
  const streak = data?.recentPayments?.filter((p: { status: string }) => p.status === 'PAID').length ?? 0;
  const onTime =
    data?.recentPayments?.length > 0
      ? Math.round(
          (data.recentPayments.filter((p: { status: string }) => p.status === 'PAID').length / data.recentPayments.length) *
            100,
        )
      : 0;
  const next = upcoming?.next_payment;
  const daysUntil = next?.days_until_due ?? null;
  const showAlert = daysUntil != null && daysUntil <= 3;
  const onboarding = data?.onboarding;
  const leasePaymentMethod = data?.activeLease?.payment_method || 'PLATFORM';

  return (
    <div>
      <PageHeader title={`Good morning, ${name}`} subtitle="Your rent, credit score, and payment health." />

      {showAlert ? (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-900">
            Rent of N${Number(next.amount || 0).toLocaleString()} is due in {daysUntil} day{daysUntil === 1 ? '' : 's'}.
          </p>
          <Link href="/tenant/payments" className="rc-btn-primary text-center">
            Pay now
          </Link>
        </div>
      ) : null}

      {error ? <ErrorStateCard message={error} onRetry={() => router.refresh()} /> : null}
      {loadingDashboard ? <SkeletonBlocks rows={5} /> : null}

      {!onboarding?.completed ? (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Complete your setup</h2>
          <div className="mt-4 space-y-3">
            {(onboarding?.steps || []).map((step: any) => (
              <div key={step.key} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm">{step.completed ? '✅' : step.blocked ? '🔒' : '⬜'}</span>
                  <p className="text-sm text-slate-800">{step.label}</p>
                </div>
                {!step.completed && !step.blocked && step.action ? (
                  <Link href={step.action} className="rounded-lg bg-brand-red px-3 py-1.5 text-xs font-semibold text-white">
                    {step.key === 'kyc_submitted'
                      ? 'Start KYC'
                      : step.key === 'payment_method_linked'
                        ? 'Add Payment Method'
                        : step.key === 'first_payment_paid'
                          ? 'Pay Now'
                          : 'Open'}
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Current score" value={score} />
        <StatCard label="Score tier" value={tier} />
        <StatCard label="Payment streak" value={streak} />
        <StatCard label="On-time rate" value={`${onTime}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rc-card">
          <h2 className="text-lg font-semibold text-gray-900">Current rent</h2>
          <p className="mt-2 text-sm text-gray-500">
            {data?.activeLease?.units?.unit_identifier ? `Unit ${data.activeLease.units.unit_identifier}` : 'Active lease'}
          </p>
          <p className="mt-4 text-2xl font-bold text-gray-900">
            N${Number(data?.activeLease?.monthly_rent || next?.amount || 0).toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-gray-500">Due: {next?.due_date ?? '—'}</p>
          <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${leasePaymentMethod === 'PLATFORM' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
            {leasePaymentMethod === 'PLATFORM' ? 'Platform Payments' : 'Direct Payments'}
          </span>
          <Link href="/tenant/payments" className="rc-btn-primary mt-6 inline-flex">
            Pay rent
          </Link>
        </div>

        <div className="rc-card">
          <h2 className="text-lg font-semibold text-gray-900">Recent payments</h2>
          <ul className="mt-4 space-y-3">
            {(data?.recentPayments ?? []).slice(0, 5).map((p: any) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm">
                <span>{p.paid_date ? new Date(p.paid_date).toLocaleDateString() : p.due_date}</span>
                <span className="font-medium">N${Number(p.amount_gross || 0).toLocaleString()}</span>
                <Badge variant={p.status === 'PAID' ? 'success' : 'warning'}>{p.status}</Badge>
              </li>
            ))}
            {!data?.recentPayments?.length ? <li className="text-sm text-gray-500">No payment activity yet.</li> : null}
          </ul>
        </div>
      </div>

      {leasePaymentMethod === 'DIRECT' ? (
        <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-sm text-indigo-900">
            Switching to platform payments enables instant score updates and removes manual confirmation.
          </p>
          <button
            type="button"
            onClick={() => api.post('/tenants/lease/payment-method-switch/request', { requested_method: 'PLATFORM' })}
            className="mt-3 rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Request Switch
          </button>
          {switchRequests.length ? (
            <div className="mt-3 space-y-2">
              {switchRequests.map((req) => (
                <div key={req.id} className="rounded-lg bg-white px-3 py-2 text-xs text-slate-700">
                  Pending switch to {req.requested_method}.{' '}
                  {!req.tenant_confirmed ? (
                    <button
                      type="button"
                      onClick={() => api.post('/tenants/lease/payment-method-switch/confirm', { request_id: req.id })}
                      className="rounded bg-emerald-600 px-2 py-1 font-semibold text-white"
                    >
                      Confirm switch
                    </button>
                  ) : (
                    <span>Awaiting landlord confirmation.</span>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 rc-card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Unread notifications</h2>
          {notifications.length ? (
            <button
              type="button"
              onClick={() => notifications.forEach((n) => markNotificationRead(n.id))}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700"
            >
              Mark all shown as read
            </button>
          ) : null}
        </div>
        <ul className="mt-4 space-y-3">
          {notifications.slice(0, 5).map((note) => (
            <li key={note.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-4">
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
          {!notifications.length ? (
            <li>
              <EmptyStateCard title="No unread notifications" description="You are all caught up for now." />
            </li>
          ) : null}
        </ul>
      </div>

      <div className="mt-6 rc-card">
        <h2 className="text-lg font-semibold text-gray-900">Lease renewals</h2>
        <ul className="mt-4 space-y-3">
          {renewals.slice(0, 3).map((renewal) => (
            <li key={renewal.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">Current lease ends {renewal.current_end_date}</p>
              <p className="mt-1 text-sm text-gray-600">
                Proposed: {renewal.proposed_end_date} at N${Number(renewal.proposed_rent || 0).toLocaleString()} ({renewal.status})
              </p>
              {renewal.status !== 'APPROVED' && renewal.status !== 'REJECTED' ? (
                <div className="mt-3 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="number"
                      placeholder="Counter rent (optional)"
                      value={counterByRenewal[renewal.id]?.proposed_rent ?? ''}
                      onChange={(event) =>
                        setCounterByRenewal((prev) => ({
                          ...prev,
                          [renewal.id]: {
                            proposed_rent: event.target.value,
                            proposed_end_date: prev[renewal.id]?.proposed_end_date ?? '',
                          },
                        }))
                      }
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800"
                    />
                    <input
                      type="date"
                      value={counterByRenewal[renewal.id]?.proposed_end_date ?? ''}
                      onChange={(event) =>
                        setCounterByRenewal((prev) => ({
                          ...prev,
                          [renewal.id]: {
                            proposed_rent: prev[renewal.id]?.proposed_rent ?? '',
                            proposed_end_date: event.target.value,
                          },
                        }))
                      }
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => sendCounterRenewal(renewal.id)}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
                    >
                      Counter
                    </button>
                  </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => respondRenewal(renewal.id, 'APPROVE')}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => respondRenewal(renewal.id, 'REJECT')}
                    className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Reject
                  </button>
                </div>
                </div>
              ) : null}
            </li>
          ))}
          {!renewals.length ? (
            <li>
              <EmptyStateCard title="No renewal proposals" description="There are currently no lease renewal actions required." />
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
