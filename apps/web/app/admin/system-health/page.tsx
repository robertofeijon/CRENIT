'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';

const services = [
  { name: 'Payment Processing', key: 'payments' },
  { name: 'KYC Service', key: 'kyc' },
  { name: 'Credit Score Engine', key: 'credit' },
  { name: 'Report Generator', key: 'reports' },
  { name: 'Data Pipeline', key: 'data' },
  { name: 'Email/Notification Service', key: 'notifications' },
];

export default function AdminSystemHealthPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [health, setHealth] = useState<Record<string, string>>({});
  const [snapshot, setSnapshot] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  useEffect(() => {
    if (user && role === 'ADMIN') {
      setLoadingSnapshot(true);
      api
        .get('/admin/system-health/overview')
        .then((res) => {
          setSnapshot(res.data?.data || null);
          setHealth({ admin: 'Operational' });
        })
        .catch((err: any) => setError(err?.response?.data?.message || 'Unable to load system health.'))
        .finally(() => setLoadingSnapshot(false));
    }
  }, [user, role]);

  const chartData = snapshot?.error_rate_7d || [];

  return (
    <div>
      <PageHeader title="System health" subtitle="Service status and error rates." />
      {error ? <ErrorStateCard message={error} onRetry={() => router.refresh()} /> : null}
      {loadingSnapshot ? <SkeletonBlocks rows={3} /> : null}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((svc) => (
          <div key={svc.key} className="rc-card">
            <p className="text-sm font-semibold text-gray-900">{svc.name}</p>
            <div className="mt-3 flex items-center justify-between">
              <Badge variant={snapshot?.services?.find((x: any) => x.key === svc.key)?.status === 'Operational' ? 'success' : 'warning'}>
                {snapshot?.services?.find((x: any) => x.key === svc.key)?.status || 'Operational'}
              </Badge>
              <span className="text-xs text-gray-500">
                {snapshot?.services?.find((x: any) => x.key === svc.key)?.uptime_30d ?? 99.9}% uptime
              </span>
            </div>
            <p className="mt-2 text-[11px] text-gray-500">
              Last checked:{' '}
              {snapshot?.services?.find((x: any) => x.key === svc.key)?.last_checked
                ? new Date(snapshot.services.find((x: any) => x.key === svc.key).last_checked).toLocaleString()
                : 'N/A'}
            </p>
          </div>
        ))}
      </div>
      <div className="rc-card mb-6">
        <h2 className="text-sm font-semibold text-gray-900">Error rate (7 days)</h2>
        <div className="mt-4 h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              {services.map((svc) => (
                <Line key={svc.key} type="monotone" dataKey={svc.key} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rc-card">
        <h2 className="text-sm font-semibold text-gray-900">Recent errors</h2>
        <div className="mt-2 space-y-2">
          {(snapshot?.recent_errors || []).slice(0, 8).map((row: any, idx: number) => (
            <div key={`${row.timestamp}-${idx}`} className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
              {new Date(row.timestamp).toLocaleString()} · {row.service} · {row.error_type} · {row.affected_endpoint} · {row.resolution_status}
            </div>
          ))}
          {!snapshot?.recent_errors?.length ? (
            <EmptyStateCard title="No recent errors" description="No critical errors were recorded in the selected period." />
          ) : null}
        </div>
        {health.admin ? <p className="mt-2 text-xs text-gray-400">Admin API: {health.admin}</p> : null}
      </div>
    </div>
  );
}
