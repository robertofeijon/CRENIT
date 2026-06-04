'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Bell,
  CreditCard,
  RefreshCw,
  ScrollText,
  TrendingUp,
} from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import TenantPageHeader from '../../components/ui/TenantPageHeader';
import LandlordStatCard from '../../components/ui/LandlordStatCard';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';
import { formatN$, statusPillClass, tenantInputClass } from '../../components/tenant/tenantUi';

export default function TenantHomePage() {
  const { user, role, loading, roleReady } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [upcoming, setUpcoming] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [counterByRenewal, setCounterByRenewal] = useState<Record<string, { proposed_rent: string; proposed_end_date: string }>>({});
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [switchRequests, setSwitchRequests] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && roleReady && !user) router.replace('/auth');
    if (!loading && roleReady && user && role === 'LANDLORD') router.replace('/landlord/overview');
  }, [loading, roleReady, user, role, router]);

  const loadDashboard = useCallback(async () => {
    if (!user || role === 'LANDLORD') return;
    setLoadingDashboard(true);
    setError(null);
    try {
      const [me, up, notes, renewalRes, switchRes] = await Promise.all([
        api.get('/tenants/me'),
        api.get('/payments/upcoming').catch(() => null),
        api.get('/notifications/unread').catch(() => null),
        api.get('/tenants/renewals').catch(() => null),
        api.get('/tenants/lease/payment-method-switch/requests').catch(() => null),
      ]);
      setData(me.data.data);
      setUpcoming(up?.data?.data ?? null);
      setNotifications(notes?.data?.data ?? []);
      setRenewals(renewalRes?.data?.data ?? []);
      setSwitchRequests(switchRes?.data?.data ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load dashboard.');
    } finally {
      setLoadingDashboard(false);
    }
  }, [user, role]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const markNotificationRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      /* non-blocking */
    }
  };

  const respondRenewal = async (renewalId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await api.post('/tenants/renewals/respond', { renewal_id: renewalId, action });
      setRenewals((prev) =>
        prev.map((item) => (item.id === renewalId ? { ...item, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' } : item)),
      );
      setMessage(`Renewal ${action === 'APPROVE' ? 'accepted' : 'declined'}.`);
    } catch {
      setError('Unable to update renewal.');
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
      setMessage('Counter proposal sent to your landlord.');
    } catch {
      setError('Unable to send counter proposal.');
    }
  };

  if (loading || !roleReady || !user) {
    return <p className="text-sm text-slate-500">Loading tenant workspace…</p>;
  }

  const name = data?.profile?.full_name ?? user.email?.split('@')[0] ?? 'there';
  const score = data?.score?.score ?? '—';
  const tier = data?.score?.tier ?? 'BUILDING';
  const paymentMetrics = data?.paymentMetrics;
  const streak = paymentMetrics?.consecutive_on_time_streak ?? 0;
  const onTime = paymentMetrics?.on_time_rate_pct ?? 0;
  const next = upcoming?.next_payment;
  const daysUntil = next?.days_until_due ?? null;
  const showAlert = daysUntil != null && daysUntil <= 3;
  const onboarding = data?.onboarding;
  const leaseSummary = data?.leaseSummary;
  const hasLease = Boolean(leaseSummary?.lease_id || data?.activeLease?.id);
  const leasePaymentMethod = leaseSummary?.payment_method || data?.activeLease?.payment_method || 'PLATFORM';

  return (
    <div className="space-y-6">
      <TenantPageHeader
        badge="Home"
        title={`Good morning, ${name}`}
        subtitle="Your rent, credit score, and verified payment history in one place."
        actions={
          <button type="button" onClick={() => void loadDashboard()} disabled={loadingDashboard} className="tenant-btn-secondary">
            <RefreshCw className={`h-4 w-4 ${loadingDashboard ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        }
      />

      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</p>
      ) : null}
      {error ? <ErrorStateCard message={error} onRetry={() => void loadDashboard()} /> : null}

      {showAlert ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-900">
            Rent of {formatN$(next.amount)} is due in {daysUntil} day{daysUntil === 1 ? '' : 's'}.
          </p>
          <Link href="/tenant/payments" className="tenant-btn-primary text-center">
            Pay now
          </Link>
        </div>
      ) : null}

      {loadingDashboard ? <SkeletonBlocks rows={4} /> : null}

      {hasLease && !loadingDashboard ? (
        <section className="tenant-panel border-[#C0392B]/20 bg-gradient-to-br from-white to-[#FDEDEC]/40">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FDEDEC]">
                <ScrollText className="h-5 w-5 text-[#C0392B]" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C0392B]/90">Your lease</p>
                <h2 className="mt-1 text-xl font-semibold text-[#1A1A1A]">
                  {leaseSummary?.property_name || 'Linked property'}
                  {leaseSummary?.unit_identifier ? ` · ${leaseSummary.unit_identifier}` : ''}
                </h2>
                {leaseSummary?.address ? <p className="mt-1 text-sm text-slate-600">{leaseSummary.address}</p> : null}
                <p className="mt-2 text-sm text-slate-600">
                  Landlord: <span className="font-medium text-[#1A1A1A]">{leaseSummary?.landlord_name}</span>
                </p>
              </div>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusPillClass(leaseSummary?.status || 'ACTIVE')}`}>
              {leaseSummary?.status || 'ACTIVE'}
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white/80 p-4 ring-1 ring-slate-100">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Monthly rent</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[#1A1A1A]">{formatN$(leaseSummary?.monthly_rent)}</p>
            </div>
            <div className="rounded-xl bg-white/80 p-4 ring-1 ring-slate-100">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Lease term</p>
              <p className="mt-1 text-sm font-medium text-[#1A1A1A]">
                {leaseSummary?.start_date ? new Date(leaseSummary.start_date).toLocaleDateString() : '—'}
                {' → '}
                {leaseSummary?.end_date ? new Date(leaseSummary.end_date).toLocaleDateString() : 'Open-ended'}
              </p>
            </div>
            <div className="rounded-xl bg-white/80 p-4 ring-1 ring-slate-100">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Payments</p>
              <p className="mt-1 text-sm font-medium text-[#1A1A1A]">
                {leasePaymentMethod === 'PLATFORM' ? 'Via CRENIT' : 'Direct to landlord'}
              </p>
            </div>
            <div className="rounded-xl bg-white/80 p-4 ring-1 ring-slate-100">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Security deposit</p>
              <p className="mt-1 text-sm font-medium text-[#1A1A1A]">
                {leaseSummary?.deposit_amount != null ? formatN$(leaseSummary.deposit_amount) : 'Not on file'}
                {leaseSummary?.deposit_status ? (
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${statusPillClass(leaseSummary.deposit_status)}`}>
                    {leaseSummary.deposit_status}
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/tenant/payments" className="tenant-btn-primary inline-flex">
              Pay rent
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/tenant/deposit" className="tenant-btn-secondary">
              View deposit
            </Link>
            <Link href="/tenant/reports" className="tenant-btn-secondary">
              Download reports
            </Link>
          </div>
        </section>
      ) : !loadingDashboard ? (
        <section className="tenant-panel border-dashed border-slate-300 bg-[#F3F4F6]/50">
          <div className="flex items-start gap-3">
            <ScrollText className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
            <div>
              <h2 className="text-lg font-semibold text-[#1A1A1A]">No lease linked yet</h2>
              <p className="mt-1 text-sm text-slate-600">
                When your landlord registers you on CRENIT or you accept an invite, your lease details will appear here.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {!onboarding?.completed && !loadingDashboard ? (
        <section className="tenant-panel">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Complete your setup</h2>
          <div className="mt-4 space-y-2">
            {(onboarding?.steps || []).map((step: any) => (
              <div key={step.key} className="flex items-center justify-between rounded-xl bg-[#F3F4F6] px-4 py-3">
                <p className="text-sm text-slate-800">{step.label}</p>
                {!step.completed && !step.blocked && step.action ? (
                  <Link href={step.action} className="tenant-btn-primary px-3 py-1.5 text-xs">
                    Open
                  </Link>
                ) : (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusPillClass(step.completed ? 'APPROVED' : 'PENDING')}`}>
                    {step.completed ? 'Done' : step.blocked ? 'Locked' : 'Pending'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <LandlordStatCard label="Current score" value={score} icon={TrendingUp} />
        <LandlordStatCard label="Score tier" value={tier} />
        <LandlordStatCard label="On-time streak" value={`${streak} mo`} icon={CreditCard} />
        <LandlordStatCard
          label="On-time rate (12 mo)"
          value={`${onTime}%`}
          accent={onTime >= 80 ? 'success' : 'default'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {hasLease ? (
          <section className="tenant-panel lg:col-span-1">
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Next payment</h2>
            <p className="mt-4 text-3xl font-semibold tabular-nums text-[#1A1A1A]">
              {formatN$(next?.amount ?? leaseSummary?.monthly_rent ?? 0)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Due: {next?.due_date ?? '—'}
              {daysUntil != null ? ` · ${daysUntil} day(s) away` : ''}
            </p>
            <Link href="/tenant/payments" className="tenant-btn-primary mt-6 inline-flex">
              Pay now
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </section>
        ) : null}

        <section className={`tenant-panel ${hasLease ? '' : 'lg:col-span-2'}`}>
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Recent payments</h2>
          <ul className="mt-4 space-y-2">
            {(data?.recentPayments ?? []).slice(0, 5).map((p: any) => (
              <li key={p.id} className="flex items-center justify-between rounded-xl bg-[#F3F4F6] px-4 py-3 text-sm">
                <span className="text-slate-600">{p.paid_date ? new Date(p.paid_date).toLocaleDateString() : p.due_date}</span>
                <span className="font-semibold text-[#1A1A1A]">{formatN$(p.amount_gross)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusPillClass(p.status)}`}>{p.status}</span>
              </li>
            ))}
            {!data?.recentPayments?.length ? (
              <li className="text-sm text-slate-500">No payment activity yet.</li>
            ) : null}
          </ul>
          <Link href="/tenant/payments" className="mt-4 inline-flex text-sm font-semibold text-[#C0392B] hover:underline">
            View all payments →
          </Link>
        </section>
      </div>

      {leasePaymentMethod === 'DIRECT' ? (
        <section className="tenant-panel border-indigo-200 bg-indigo-50/50">
          <p className="text-sm text-indigo-900">
            Switch to platform payments for instant score updates — no manual landlord confirmation.
          </p>
          <button
            type="button"
            className="tenant-btn-primary mt-3"
            onClick={async () => {
              try {
                await api.post('/tenants/lease/payment-method-switch/request', { requested_method: 'PLATFORM' });
                setMessage('Switch request sent to your landlord.');
              } catch {
                setError('Unable to request payment method switch.');
              }
            }}
          >
            Request platform payments
          </button>
          {switchRequests.length ? (
            <div className="mt-3 space-y-2">
              {switchRequests.map((req) => (
                <div key={req.id} className="rounded-xl bg-white px-3 py-2 text-xs text-slate-700">
                  Pending switch to {req.requested_method}.{' '}
                  {!req.tenant_confirmed ? (
                    <button
                      type="button"
                      className="ml-1 font-semibold text-emerald-700 hover:underline"
                      onClick={() =>
                        api.post('/tenants/lease/payment-method-switch/confirm', { request_id: req.id }).then(() =>
                          setMessage('Switch confirmed — awaiting landlord.'),
                        )
                      }
                    >
                      Confirm
                    </button>
                  ) : (
                    <span>Awaiting landlord confirmation.</span>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="tenant-panel">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#C0392B]" aria-hidden />
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Notifications</h2>
          </div>
          {notifications.length ? (
            <button
              type="button"
              className="tenant-btn-secondary px-3 py-1.5 text-xs"
              onClick={() => notifications.forEach((n) => void markNotificationRead(n.id))}
            >
              Mark all read
            </button>
          ) : null}
        </div>
        <ul className="mt-4 space-y-2">
          {notifications.slice(0, 5).map((note) => (
            <li key={note.id} className="rounded-xl border border-slate-100 bg-[#F3F4F6] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{note.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{note.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{new Date(note.created_at).toLocaleString()}</p>
                </div>
                <button type="button" className="text-xs font-semibold text-slate-600 hover:text-[#1A1A1A]" onClick={() => void markNotificationRead(note.id)}>
                  Dismiss
                </button>
              </div>
            </li>
          ))}
          {!notifications.length ? (
            <EmptyStateCard title="All caught up" description="No unread notifications right now." />
          ) : null}
        </ul>
      </section>

      <section className="tenant-panel">
        <div className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-[#C0392B]" aria-hidden />
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Lease renewals</h2>
        </div>
        <ul className="mt-4 space-y-3">
          {renewals.slice(0, 3).map((renewal) => (
            <li key={renewal.id} className="rounded-xl border border-slate-100 bg-[#F3F4F6] p-4">
              <p className="text-sm font-semibold text-[#1A1A1A]">Current lease ends {renewal.current_end_date}</p>
              <p className="mt-1 text-sm text-slate-600">
                Proposed: {renewal.proposed_end_date} at {formatN$(renewal.proposed_rent)} ·{' '}
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusPillClass(renewal.status)}`}>
                  {renewal.status}
                </span>
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
                      className={tenantInputClass}
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
                      className={tenantInputClass}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="tenant-btn-secondary" onClick={() => void sendCounterRenewal(renewal.id)}>
                      Send counter
                    </button>
                    <button type="button" className="tenant-btn-primary" onClick={() => void respondRenewal(renewal.id, 'APPROVE')}>
                      Accept
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
                      onClick={() => void respondRenewal(renewal.id, 'REJECT')}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
          {!renewals.length ? (
            <EmptyStateCard title="No renewal proposals" description="Your landlord has not sent a renewal offer yet." />
          ) : null}
        </ul>
      </section>
    </div>
  );
}
