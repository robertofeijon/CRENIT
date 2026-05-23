'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';

export default function AdminCreditScoresPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  useEffect(() => {
    if (user && role === 'ADMIN') {
      api
        .get('/admin/users', { params: { limit: 100 } })
        .then((res) => {
          const tenants = (res.data.data?.users ?? res.data.data ?? []).filter(
            (u: { role?: string }) => u.role === 'TENANT',
          );
          setRows(tenants);
        })
        .catch((err: any) => setError(err?.response?.data?.message || 'Failed to load scores.'));
    }
  }, [user, role]);

  const tierVariant = (tier?: string) => {
    if (tier === 'EXCELLENT') return 'success';
    if (tier === 'GOOD') return 'info';
    if (tier === 'FAIR') return 'warning';
    return 'neutral';
  };

  return (
    <div>
      <PageHeader title="Credit scores" subtitle="Tenant score registry and anomaly review." />
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      <div className="rc-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
              <th className="py-3 pr-4">Tenant</th>
              <th className="py-3 pr-4">Score</th>
              <th className="py-3 pr-4">Tier</th>
              <th className="py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 font-medium">{row.full_name ?? row.email ?? row.id}</td>
                <td className="py-3">{row.credit_score ?? '—'}</td>
                <td className="py-3">
                  <Badge variant={tierVariant(row.credit_tier)}>{row.credit_tier ?? 'BUILDING'}</Badge>
                </td>
                <td className="py-3 text-xs text-gray-500">Flag · Override (audit logged)</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
