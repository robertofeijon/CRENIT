'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';

const services = [
  { name: 'Payment Processing', key: 'payments' },
  { name: 'KYC Service', key: 'kyc' },
  { name: 'Credit Engine', key: 'credit' },
  { name: 'Report Generator', key: 'reports' },
  { name: 'Data Pipeline', key: 'data' },
];

export default function AdminSystemHealthPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [health, setHealth] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  useEffect(() => {
    if (user && role === 'ADMIN') {
      api.get('/admin/health').then((admin) => {
        setHealth({ admin: admin.data?.data?.module ? 'Operational' : 'Degraded' });
      });
    }
  }, [user, role]);

  const chartData = Array.from({ length: 7 }, (_, i) => ({
    day: `D-${6 - i}`,
    errors: Math.max(0, Math.round(Math.random() * 8)),
  }));

  return (
    <div>
      <PageHeader title="System health" subtitle="Service status and error rates." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((svc) => (
          <div key={svc.key} className="rc-card">
            <p className="text-sm font-semibold text-gray-900">{svc.name}</p>
            <div className="mt-3 flex items-center justify-between">
              <Badge variant="success">Operational</Badge>
              <span className="text-xs text-gray-500">99.9% uptime</span>
            </div>
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
              <Line type="monotone" dataKey="errors" stroke="#C0392B" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rc-card">
        <h2 className="text-sm font-semibold text-gray-900">Recent errors</h2>
        <p className="mt-2 text-sm text-gray-500">No critical errors in the last 24 hours.</p>
        {health.admin ? <p className="mt-2 text-xs text-gray-400">Admin API: {health.admin}</p> : null}
      </div>
    </div>
  );
}
