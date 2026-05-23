'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';

export default function TenantHomePage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [upcoming, setUpcoming] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role === 'LANDLORD') router.replace('/landlord');
  }, [loading, user, role, router]);

  useEffect(() => {
    if (!user || role === 'LANDLORD') return;
    Promise.all([api.get('/tenants/me'), api.get('/payments/upcoming').catch(() => null)])
      .then(([me, up]) => {
        setData(me.data.data);
        setUpcoming(up?.data?.data ?? null);
      })
      .catch((err: any) => setError(err?.response?.data?.message || 'Failed to load dashboard.'));
  }, [user, role]);

  if (loading || !user) return <p className="text-sm text-gray-500">Loading…</p>;

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

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

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
            {!data?.recentPayments?.length ? <li className="text-sm text-gray-500">No payments yet.</li> : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
