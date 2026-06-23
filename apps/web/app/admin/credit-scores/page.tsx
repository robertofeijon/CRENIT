'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, LineChart as LineChartIcon, RefreshCw, Search, TrendingUp, Users } from 'lucide-react';
import dynamic from 'next/dynamic';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';

const LazyScoreHistoryChart = dynamic(() => import('../../components/charts/ScoreHistoryChart'), {
  ssr: false,
  loading: () => <SkeletonBlocks rows={3} />,
});
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import AdminPageHeader from '../../components/ui/AdminPageHeader';
import AdminStatCard from '../../components/ui/AdminStatCard';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';

function tierBadgeClass(tier?: string) {
  if (tier === 'EXCELLENT') return 'bg-emerald-100 text-emerald-800';
  if (tier === 'GOOD') return 'bg-sky-100 text-sky-800';
  if (tier === 'FAIR') return 'bg-amber-100 text-amber-900';
  return 'bg-slate-100 text-slate-700';
}

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
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [anomalyOnly, setAnomalyOnly] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  const loadRows = useCallback(async () => {
    setLoadingRows(true);
    setError(null);
    try {
      const res = await api.get('/admin/credit-scores/audit', { params: { limit: 100 } });
      setRows(res.data?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load score records.');
    } finally {
      setLoadingRows(false);
    }
  }, []);

  useEffect(() => {
    if (user && role === 'ADMIN') {
      void loadRows();
    }
  }, [user, role, loadRows]);

  const loadDetail = async (row: any) => {
    setSelected(row);
    setOverrideScore(String(row.score || ''));
    setOverrideReason('');
    setMessage(null);
    try {
      const res = await api.get(`/admin/credit-scores/${row.tenant_id}/history?limit=12`);
      setHistory(res.data?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load score history.');
    }
  };

  const flagAnomaly = async () => {
    if (!selected) return;
    setError(null);
    try {
      await api.post(`/admin/credit-scores/${selected.tenant_id}/flag-anomaly`, {
        note: 'Manual anomaly review required.',
      });
      setMessage('Anomaly flagged for review.');
      await loadRows();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to flag anomaly.');
    }
  };

  const submitOverride = async () => {
    if (!selected || !overrideScore || !overrideReason.trim()) {
      setError('Score and reason are required for override.');
      return;
    }
    setError(null);
    try {
      await api.post(`/admin/credit-scores/${selected.tenant_id}/manual-override`, {
        score: Number(overrideScore),
        reason: overrideReason.trim(),
      });
      setMessage('Score override saved.');
      setSelected(null);
      await loadRows();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to save override.');
    }
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (anomalyOnly && !row.anomaly_flag) return false;
      if (tierFilter && row.tier !== tierFilter) return false;
      if (!q) return true;
      const name = String(row.tenant_name || '').toLowerCase();
      const id = String(row.tenant_id || '').toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [rows, search, tierFilter, anomalyOnly]);

  const summary = useMemo(() => {
    const scores = rows.map((r) => Number(r.score)).filter((n) => !Number.isNaN(n));
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    return {
      total: rows.length,
      anomalies: rows.filter((r) => r.anomaly_flag).length,
      excellent: rows.filter((r) => r.tier === 'EXCELLENT').length,
      avg,
    };
  }, [rows]);


  return (
    <div className="space-y-6">
      <AdminPageHeader
        badge="Credit"
        title="Credit score registry"
        subtitle="Current tenant scores from Supabase — inspect factors, flag anomalies, or apply manual overrides."
        actions={
          <button
            type="button"
            onClick={() => void loadRows()}
            disabled={loadingRows}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A] transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loadingRows ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        }
      />

      {error ? <ErrorStateCard message={error} onRetry={loadRows} /> : null}
      {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard label="Tenants scored" value={summary.total} icon={Users} />
        <AdminStatCard
          label="Average score"
          value={summary.avg ?? '—'}
          sub="Across loaded records"
          icon={LineChartIcon}
        />
        <AdminStatCard
          label="Anomalies flagged"
          value={summary.anomalies}
          icon={AlertTriangle}
          accent={summary.anomalies > 0 ? 'warning' : 'default'}
        />
        <AdminStatCard label="Excellent tier" value={summary.excellent} sub="Tier EXCELLENT" icon={TrendingUp} accent="success" />
      </section>

      <p className="text-sm text-slate-600">
        Related:{' '}
        <Link href="/admin/users" className="font-semibold text-[#C0392B] hover:underline">
          User management →
        </Link>
        {' · '}
        <Link href="/admin/payments" className="font-semibold text-[#C0392B] hover:underline">
          Payments
        </Link>
      </p>

      <div className="admin-panel">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Search tenant</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or tenant ID"
                className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-[#C0392B]/60"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tier</label>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="w-full min-w-[140px] rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#C0392B]/60"
            >
              <option value="">All tiers</option>
              <option value="EXCELLENT">Excellent</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="BUILDING">Building</option>
            </select>
          </div>
          <label className="flex items-center gap-2 pb-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={anomalyOnly}
              onChange={(e) => setAnomalyOnly(e.target.checked)}
              className="rounded border-slate-300 text-[#C0392B] focus:ring-[#C0392B]"
            />
            Anomalies only
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Showing {filteredRows.length} of {rows.length} records
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="admin-panel overflow-hidden">
          {loadingRows ? (
            <div className="p-6">
              <SkeletonBlocks rows={4} />
            </div>
          ) : filteredRows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-[#F3F4F6] text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-4 font-semibold">Tenant</th>
                    <th className="px-5 py-4 font-semibold">Score</th>
                    <th className="px-5 py-4 font-semibold">Tier</th>
                    <th className="px-5 py-4 font-semibold">Flags</th>
                    <th className="px-5 py-4 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-50 transition hover:bg-slate-50 ${
                        selected?.id === row.id ? 'bg-[#FDEDEC]' : ''
                      }`}
                    >
                      <td className="px-5 py-4 font-medium text-[#1A1A1A]">{row.tenant_name ?? row.tenant_id}</td>
                      <td className="px-5 py-4 tabular-nums">{row.score ?? '—'}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tierBadgeClass(row.tier)}`}>
                          {row.tier ?? 'BUILDING'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {row.anomaly_flag ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800">
                            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                            Anomaly
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => void loadDetail(row)}
                          className="rounded-full bg-[#1A1A1A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#111111]"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : rows.length ? (
            <div className="p-6">
              <EmptyStateCard
                title="No matches"
                description="Adjust search or filters — or clear filters to see all score records."
              />
            </div>
          ) : (
            <div className="p-6">
              <EmptyStateCard
                title="No score records"
                description="Run supabase/seed.sql to populate credit_scores for demo tenants."
              />
            </div>
          )}
        </div>

        <aside className="admin-panel h-fit">
          <div className="flex items-center gap-2">
            <LineChartIcon className="h-5 w-5 text-[#C0392B]" aria-hidden />
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Score detail</h2>
          </div>
          {!selected ? (
            <p className="mt-4 text-sm text-slate-500">Select a tenant row to inspect factors and history.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#C0392B]" aria-hidden />
                <p className="font-semibold text-[#1A1A1A]">{selected.tenant_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#F3F4F6] p-4 text-xs text-slate-700">
                <p>Payment history (35%): {selected.payment_history_score ?? '—'}</p>
                <p>Streak (20%): {selected.streak_score ?? '—'}</p>
                <p>Tenancy length (20%): {selected.history_length_score ?? '—'}</p>
                <p>Income/rent (15%): {selected.income_rent_ratio_score ?? '—'}</p>
                <p>Deposit (10%): {selected.deposit_management_score ?? '—'}</p>
              </div>
              <div className="h-[180px] rounded-xl border border-slate-100 bg-[#F3F4F6] p-2">
                <LazyScoreHistoryChart data={history} />
              </div>
              <button
                type="button"
                onClick={() => void flagAnomaly()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900"
              >
                <AlertTriangle className="h-4 w-4" aria-hidden />
                Flag anomaly
              </button>
              <div className="rounded-xl border border-slate-200 bg-[#F3F4F6] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Manual override</p>
                <input
                  type="number"
                  min={300}
                  max={900}
                  value={overrideScore}
                  onChange={(e) => setOverrideScore(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#C0392B]/60"
                  placeholder="New score (300–900)"
                />
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#C0392B]/60"
                  placeholder="Reason (required)"
                  rows={3}
                />
                <button
                  type="button"
                  onClick={() => void submitOverride()}
                  className="mt-3 w-full rounded-full bg-[#C0392B] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#C0392B]/20"
                >
                  Save override
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
