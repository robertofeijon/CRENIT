'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  ClipboardList,
  CreditCard,
  Database,
  LineChart,
  RefreshCw,
  Scale,
  ScrollText,
  Shield,
  ShieldCheck,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import api from '../../src/lib/api';
import { useAuth } from '../../src/contexts/AuthContext';
import AdminPageHeader from '../components/ui/AdminPageHeader';
import AdminStatCard from '../components/ui/AdminStatCard';
import SkeletonBlocks from '../components/ui/SkeletonBlocks';
import ErrorStateCard from '../components/ui/ErrorStateCard';

type QuickLink = {
  title: string;
  href: string;
  desc: string;
  icon: LucideIcon;
};

const QUICK_LINKS: QuickLink[] = [
  { title: 'Users', href: '/admin/users', desc: 'Search, suspend, review accounts', icon: Users },
  { title: 'KYC queue', href: '/admin/kyc', desc: 'Approve or reject identity', icon: BadgeCheck },
  { title: 'Partner approvals', href: '/admin/partner-approvals', desc: 'Landlord onboarding reviews', icon: UserCheck },
  { title: 'Service requests', href: '/admin/service-requests', desc: 'Assisted uploads & documents', icon: ClipboardList },
  { title: 'Payments', href: '/admin/payments', desc: 'Volume, settlement, methods', icon: CreditCard },
  { title: 'Disputes', href: '/admin/disputes', desc: 'Escrow arbitration', icon: Scale },
  { title: 'Credit scores', href: '/admin/credit-scores', desc: 'Registry, overrides, anomalies', icon: LineChart },
  { title: 'Data intelligence', href: '/admin/data-intelligence', desc: 'B2B rental market data', icon: Database },
  { title: 'Compliance (GDPR)', href: '/admin/compliance', desc: 'Export & right to erasure', icon: Shield },
  { title: 'Audit log', href: '/admin/audit', desc: 'Admin action history', icon: ScrollText },
  { title: 'KYC compliance', href: '/admin/kyc/compliance', desc: 'Consent & verification audit', icon: ShieldCheck },
  { title: 'System health', href: '/admin/system-health', desc: 'DB probes & platform status', icon: Activity },
];

export default function AdminPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [escrow, setEscrow] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  const loadDashboard = useCallback(() => {
    if (!user || role !== 'ADMIN') return;
    setIsLoading(true);
    setError(null);
    Promise.all([
      api.get('/admin/overview'),
      api.get('/admin/escrow/overview?limit=5').catch(() => null),
    ])
      .then(([overviewRes, escrowRes]) => {
        setStats(overviewRes.data.data);
        setEscrow(escrowRes?.data?.data ?? null);
        setLastRefresh(new Date());
      })
      .catch((err: any) => setError(err?.response?.data?.message || err?.message || 'Unable to load overview.'))
      .finally(() => setIsLoading(false));
  }, [user, role]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading || !user || role !== 'ADMIN') {
    return <p className="text-sm text-slate-500">Loading admin workspace...</p>;
  }

  const attentionItems = [
    {
      label: 'KYC pending',
      count: Number(stats?.pending_kyc ?? 0),
      href: '/admin/kyc',
      urgent: true,
    },
    {
      label: 'Open disputes',
      count: Number(stats?.open_disputes ?? 0),
      href: '/admin/disputes',
      urgent: true,
    },
    {
      label: 'Partner approvals',
      count: Number(stats?.pending_partner_approvals ?? 0),
      href: '/admin/partner-approvals',
      urgent: false,
    },
    {
      label: 'Service requests',
      count: Number(stats?.pending_service_requests ?? 0),
      href: '/admin/service-requests',
      urgent: false,
    },
    {
      label: 'Documents to review',
      count: Number(stats?.pending_attachments ?? 0),
      href: '/admin/service-requests',
      urgent: false,
    },
  ].filter((item) => item.count > 0);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        badge="Platform overview"
        title="Admin dashboard"
        subtitle="Live pulse from Supabase — who needs attention, money moving through the platform, and shortcuts to every workspace."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadDashboard}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#1A1A1A] hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
              Refresh
            </button>
            <Link
              href="/admin/kyc"
              className="inline-flex items-center justify-center rounded-full bg-[#C0392B] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#C0392B]/25 transition hover:bg-[#992d24]"
            >
              Review KYC
            </Link>
          </div>
        }
      />

      {lastRefresh ? (
        <p className="text-xs text-slate-500">Data refreshed {lastRefresh.toLocaleString()}</p>
      ) : null}

      {error ? <ErrorStateCard message={error} onRetry={loadDashboard} /> : null}

      {isLoading ? (
        <SkeletonBlocks rows={4} />
      ) : stats ? (
        <>
          {attentionItems.length > 0 ? (
            <section className="rounded-[1.5rem] border border-amber-200 bg-amber-50/80 p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-800" aria-hidden />
                <h2 className="font-semibold text-amber-950">Needs attention</h2>
              </div>
              <ul className="mt-4 flex flex-wrap gap-3">
                {attentionItems.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                        item.urgent
                          ? 'bg-[#C0392B] text-white shadow-sm hover:bg-[#992d24]'
                          : 'bg-white text-[#1A1A1A] ring-1 ring-amber-200 hover:bg-amber-50'
                      }`}
                    >
                      {item.label}
                      <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs tabular-nums">{item.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard label="Total users" value={stats.total_users ?? 0} icon={Users} />
            <AdminStatCard
              label="Pending KYC"
              value={stats.pending_kyc ?? 0}
              icon={BadgeCheck}
              accent={Number(stats.pending_kyc) > 0 ? 'warning' : 'default'}
            />
            <AdminStatCard
              label="Open disputes"
              value={stats.open_disputes ?? 0}
              icon={Scale}
              accent={Number(stats.open_disputes) > 0 ? 'warning' : 'default'}
            />
            <AdminStatCard label="Paid transactions" value={stats.paid_payment_count ?? 0} icon={CreditCard} />
            <AdminStatCard
              label="Payment volume"
              value={`N$${Number(stats.total_payment_volume || 0).toLocaleString()}`}
              icon={Wallet}
            />
            <AdminStatCard
              label="Commission"
              value={`N$${Number(stats.total_commission || 0).toLocaleString()}`}
              accent="dark"
            />
            <AdminStatCard label="Active tenants" value={stats.active_tenants ?? 0} />
            <AdminStatCard label="Active landlords" value={stats.active_landlords ?? 0} />
          </section>

          {escrow?.recent_transactions?.length ? (
            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#1A1A1A]">Recent escrow activity</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Held N${Number(escrow?.summary?.total_held || 0).toLocaleString()} · Released N$
                    {Number(escrow?.summary?.total_released || 0).toLocaleString()}
                  </p>
                </div>
                <Link href="/admin/disputes" className="text-sm font-semibold text-[#C0392B] hover:underline">
                  Open disputes →
                </Link>
              </div>
              <div className="mt-4 space-y-2">
                {escrow.recent_transactions.map((row: any) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F3F4F6] px-4 py-3 text-sm"
                  >
                    <span className="font-medium text-[#1A1A1A]">{row.transaction_type}</span>
                    <span className="text-slate-700">N${Number(row.amount || 0).toLocaleString()}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600">{row.status}</span>
                    <span className="text-xs text-slate-400">
                      {row.created_at ? new Date(row.created_at).toLocaleString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Workspaces</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {QUICK_LINKS.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="group rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#C0392B]/40 hover:shadow-md"
                  >
                    <Icon className="h-5 w-5 text-[#C0392B]" aria-hidden />
                    <p className="mt-3 font-semibold text-[#1A1A1A] group-hover:text-[#C0392B]">{card.title}</p>
                    <p className="mt-2 text-sm text-slate-600">{card.desc}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
