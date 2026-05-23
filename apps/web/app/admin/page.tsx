'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../src/lib/api';
import { useAuth } from '../../src/contexts/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';

export default function AdminPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  useEffect(() => {
    if (user && role === 'ADMIN') {
      api
        .get('/admin/overview')
        .then((res) => setStats(res.data.data))
        .catch((err: any) => setError(err?.response?.data?.message || err?.message || 'Unable to load overview.'));
    }
  }, [user, role]);

  if (loading || !user || role !== 'ADMIN') {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Platform health, KYC queue, payments, and disputes." />
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total users" value={stats.total_users ?? 0} />
          <StatCard label="Pending KYC" value={stats.pending_kyc ?? 0} />
          <StatCard label="Open disputes" value={stats.open_disputes ?? 0} />
          <StatCard label="Paid transactions" value={stats.paid_payment_count ?? 0} />
          <StatCard label="Payment volume" value={`N$${Number(stats.total_payment_volume || 0).toLocaleString()}`} />
          <StatCard label="Commission" value={`N$${Number(stats.total_commission || 0).toLocaleString()}`} />
          <StatCard label="Platform uptime" value="99.9%" sub="Last 30 days" />
          <StatCard label="Active tenants" value={stats.active_tenants ?? '—'} />
        </div>
      ) : (
        <p className="text-sm text-gray-500">Loading stats…</p>
      )}
    </div>
  );
}
