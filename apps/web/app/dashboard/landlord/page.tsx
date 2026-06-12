'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  FileCheck,
  LineChart,
  Receipt,
  RefreshCw,
  Users,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import LandlordPageHeader from '../../components/ui/LandlordPageHeader';
import LandlordStatCard from '../../components/ui/LandlordStatCard';
import Badge from '../../components/ui/Badge';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import { LandlordWorkspaceLoading } from '../../components/ui/WorkspaceLoading';
import { landlordNavItems } from '../../components/landlord/landlordNav';
import { useNotificationRealtime } from '../../../src/hooks/useNotificationRealtime';

const WORKSPACE_LINKS = landlordNavItems.filter((item) => item.href !== '/landlord/overview');

export default function LandlordDashboard() {
  const { user, loading, roleReady, role } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [switchRequests, setSwitchRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && roleReady && !user) router.replace('/auth');
    if (!loading && roleReady && user && role && role !== 'LANDLORD' && role !== 'ADMIN') router.replace('/tenant/home');
  }, [loading, roleReady, user, role, router]);

  useEffect(() => {
    if (user && (role === 'LANDLORD' || role === 'ADMIN')) loadOverview();
    if (user && (role === 'LANDLORD' || role === 'ADMIN')) loadNotifications();
    if (user && (role === 'LANDLORD' || role === 'ADMIN')) loadSwitchRequests();
  }, [user, role]);

  useNotificationRealtime(user?.id, (event, row) => {
    if (row.read) {
      setNotifications((prev) => prev.filter((n) => n.id !== row.id));
      return;
    }
    setNotifications((prev) => {
      const without = prev.filter((n) => n.id !== row.id);
      return event === 'insert' ? [row, ...without] : without.map((n) => (n.id === row.id ? row : n));
    });
  });

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

  if (loading || !roleReady || !user) {
    return <LandlordWorkspaceLoading />;
  }

  const stats = dashboard?.stats ?? {};
  const statsLoading = isLoading && !dashboard;
  const hasDirectLease = (dashboard?.tenants ?? []).some((tenant: any) => tenant.payment_method === 'DIRECT');
  const pendingApproval = (dashboard?.landlord?.partnerStatus || '').toUpperCase() === 'PENDING_APPROVAL';
  const formatMoney = (v: unknown) => `N$${Number(v || 0).toLocaleString()}`;
  const hrefWhenApproved = (href: string) => (pendingApproval ? '/landlord/onboarding' : href);

  return (
    <div className="space-y-8">
      <LandlordPageHeader
        badge="Portfolio"
        title="Overview"
        subtitle="Live metrics from your properties, tenants, and payments — your partner command centre."
        actions={
          <button type="button" onClick={loadOverview} disabled={isLoading} className="landlord-btn-secondary">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        }
      />

      {error ? <ErrorStateCard message={error} onRetry={() => void loadOverview()} /> : null}

      {statsLoading ? (
        <SkeletonBlocks rows={3} />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <LandlordStatCard
            label="Properties"
            value={stats.totalProperties ?? 0}
            sub={Number(stats.totalProperties) === 0 ? 'Add your first property' : undefined}
            icon={Building2}
          />
          <LandlordStatCard
            label="Active tenants"
            value={stats.activeTenants ?? 0}
            sub={Number(stats.activeTenants) === 0 ? 'Invite tenants from the Tenants workspace' : undefined}
            icon={Users}
          />
          <LandlordStatCard
            label="Monthly rent expected"
            value={formatMoney(stats.monthlyRentExpected)}
            icon={Receipt}
          />
          <LandlordStatCard
            label="Collected this month"
            value={formatMoney(stats.collectedThisMonth)}
            icon={Receipt}
            accent="success"
          />
          <LandlordStatCard
            label="Outstanding balance"
            value={formatMoney(stats.outstanding)}
            icon={Wallet}
            accent={Number(stats.outstanding) > 0 ? 'warning' : 'default'}
          />
          <LandlordStatCard
            label="Data recording (monthly)"
            value={formatMoney(stats.commissionEarnedThisMonth)}
            icon={Wallet}
            accent="dark"
          />
        </section>
      )}

      {!statsLoading && Number(stats.totalProperties) === 0 ? (
        <div className="space-y-3">
          <EmptyStateCard
            title="No properties yet"
            description="Add a property and invite tenants to start collecting verified rent data."
          />
          <Link href={hrefWhenApproved('/landlord/properties')} className="landlord-btn-primary inline-flex">
            Add property
          </Link>
        </div>
      ) : null}

      {hasDirectLease ? (
        <div className="landlord-panel border-indigo-200 bg-indigo-50/80">
          <p className="text-sm text-indigo-900">
            Direct leases require manual confirmation. Switch to platform payments for instant score updates.
          </p>
          <Link href={hrefWhenApproved('/landlord/leases')} className="mt-3 inline-flex landlord-btn-primary text-xs">
            Request switch
          </Link>
        </div>
      ) : null}

      {switchRequests.length ? (
        <div className="landlord-panel border-emerald-200 bg-emerald-50/80">
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

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Workspaces</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WORKSPACE_LINKS.map((card) => {
            const Icon = card.icon as LucideIcon;
            return (
              <Link
                key={card.href}
                href={hrefWhenApproved(card.href)}
                className="group rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#C0392B]/40 hover:shadow-md"
              >
                <Icon className="h-5 w-5 text-[#C0392B]" aria-hidden />
                <p className="mt-3 font-semibold text-[#1A1A1A] group-hover:text-[#C0392B]">{card.label}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="landlord-panel lg:col-span-3">
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
            <Link href={hrefWhenApproved('/landlord/tenants')} className="landlord-btn-primary">
              Tenants
            </Link>
            <Link href={hrefWhenApproved('/landlord/payments')} className="landlord-btn-secondary">
              Payments
            </Link>
            <Link href={hrefWhenApproved('/landlord/deposits')} className="landlord-btn-secondary">
              Deposits
            </Link>
          </div>
        </div>

        <div className="landlord-panel lg:col-span-2">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Quick actions</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {[
              { label: 'Invite tenant', href: '/landlord/tenants', icon: Users },
              { label: 'Record deposit', href: '/landlord/deposits', icon: Wallet },
              { label: 'Generate report', href: '/landlord/reports', icon: FileCheck },
              { label: 'Market insights', href: '/landlord/market-data', icon: LineChart },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={hrefWhenApproved(item.href)}
                    className="flex items-center justify-between gap-2 rounded-xl bg-[#F3F4F6] px-4 py-3 font-medium text-[#1A1A1A] hover:bg-[#FDEDEC]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-4 w-4 text-[#C0392B]" aria-hidden />
                      {item.label}
                    </span>
                    <span className="text-[#C0392B]">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="landlord-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Recent payments</h2>
          <Link href={hrefWhenApproved('/landlord/payments')} className="text-sm font-semibold text-[#C0392B] hover:underline">
            View all
          </Link>
        </div>
        {statsLoading ? (
          <div className="mt-4">
            <SkeletonBlocks rows={3} />
          </div>
        ) : (dashboard?.recentPayments ?? []).length ? (
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
          </div>
        ) : (
          <div className="mt-4">
            <EmptyStateCard
              title="No payments recorded yet"
              description="Payments appear here once tenants pay on-platform or you confirm direct rent."
            />
          </div>
        )}
      </div>

      <div className="landlord-panel">
        <h2 className="text-lg font-semibold text-[#1A1A1A]">Unread notifications</h2>
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
          {!notifications.length ? (
            <li>
              <EmptyStateCard title="All caught up" description="Unread alerts about payments, tenants, and deposits will show here." />
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

