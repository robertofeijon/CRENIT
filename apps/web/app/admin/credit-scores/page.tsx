'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';

export default function AdminCreditScoresPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [overrideScore, setOverrideScore] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  useEffect(() => {
    if (user && role === 'ADMIN') {
      setLoadingRows(true);
      api
        .get('/admin/credit-scores/audit', { params: { limit: 100 } })
        .then((res) => setRows(res.data?.data || []))
        .catch((err: any) => setError(err?.response?.data?.message || 'Unable to load score records.'))
        .finally(() => setLoadingRows(false));
    }
  }, [user, role]);

  const tierVariant = (tier?: string) => {
    if (tier === 'EXCELLENT') return 'success';
    if (tier === 'GOOD') return 'info';
    if (tier === 'FAIR') return 'warning';
    return 'neutral';
  };

  const loadDetail = async (row: any) => {
    setSelected(row);
    setOverrideScore(String(row.score || ''));
    setOverrideReason('');
    try {
      const res = await api.get(`/admin/credit-scores/${row.tenant_id}/history?limit=12`);
      setHistory(res.data?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load score history.');
    }
  };

  const flagAnomaly = async () => {
    if (!selected) return;
    await api.post(`/admin/credit-scores/${selected.tenant_id}/flag-anomaly`, { note: 'Manual anomaly review required.' });
    const refreshed = await api.get('/admin/credit-scores/audit', { params: { limit: 100 } });
    setRows(refreshed.data?.data || []);
  };

  const submitOverride = async () => {
    if (!selected || !overrideScore || !overrideReason.trim()) return;
    await api.post(`/admin/credit-scores/${selected.tenant_id}/manual-override`, {
      score: Number(overrideScore),
      reason: overrideReason.trim(),
    });
    const refreshed = await api.get('/admin/credit-scores/audit', { params: { limit: 100 } });
    setRows(refreshed.data?.data || []);
    setSelected(null);
  };

  return (
    <div>
      <PageHeader title="Credit scores" subtitle="Tenant score registry and anomaly review." />
      {error ? <ErrorStateCard message={error} onRetry={() => router.refresh()} /> : null}
      <div className="grid gap-6 lg:grid-cols-2">
      {loadingRows ? <SkeletonBlocks rows={4} /> : null}
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
                <td className="py-3 font-medium">{row.tenant_name ?? row.tenant_id}</td>
                <td className="py-3">{row.score ?? '—'}</td>
                <td className="py-3">
                  <Badge variant={tierVariant(row.tier)}>{row.tier ?? 'BUILDING'}</Badge>
                </td>
                <td className="py-3">
                  <button type="button" onClick={() => loadDetail(row)} className="text-xs text-brand-red">
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loadingRows && !rows.length ? (
          <EmptyStateCard title="No score records" description="No current tenant scores were found." />
        ) : null}
      </div>
      <div className="rc-card">
        <h2 className="text-sm font-semibold text-gray-900">Detail panel</h2>
        {!selected ? (
          <p className="mt-2 text-sm text-gray-500">Select a row to inspect score factors and history.</p>
        ) : (
          <div className="mt-3 space-y-4">
            <p className="text-sm font-semibold">{selected.tenant_name}</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
              <p>Payment history (35%): {selected.payment_history_score}</p>
              <p>Payment streak (20%): {selected.streak_score}</p>
              <p>Tenancy length (20%): {selected.history_length_score}</p>
              <p>Income-to-rent ratio (15%): {selected.income_rent_ratio_score}</p>
              <p>Deposit management (10%): {selected.deposit_management_score}</p>
            </div>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="recorded_at" tickFormatter={(v) => String(v).slice(0, 10)} />
                  <YAxis domain={[300, 900]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#C0392B" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={flagAnomaly} className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs">
                Flag Anomaly
              </button>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs font-semibold text-gray-700">Manual override</p>
              <input
                type="number"
                value={overrideScore}
                onChange={(e) => setOverrideScore(e.target.value)}
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="New score"
              />
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Reason (required)"
                rows={3}
              />
              <button type="button" onClick={submitOverride} className="mt-2 rounded-md bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white">
                Save Override
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
