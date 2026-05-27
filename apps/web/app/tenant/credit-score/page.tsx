"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import RentalCreditModelCard from '../../components/credit/RentalCreditModelCard';

const FACTOR_LABELS: Record<string, { label: string; weight: string }> = {
  payment_history: { label: 'Payment history', weight: '35%' },
  streak: { label: 'Payment streak', weight: '20%' },
  history_length: { label: 'Rental history length', weight: '20%' },
  income_rent_ratio: { label: 'Income-to-rent ratio', weight: '15%' },
  deposit_management: { label: 'Deposit management', weight: '10%' },
};

const tierColors: Record<string, string> = {
  EXCELLENT: 'text-emerald-600',
  GOOD: 'text-blue-600',
  FAIR: 'text-amber-600',
  BUILDING: 'text-slate-600',
};

export default function TenantCreditScorePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [scoreData, setScoreData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user) loadScore();
  }, [loading, user, router]);

  const loadScore = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [scoreRes, historyRes] = await Promise.all([api.get('/credit-score/me'), api.get('/credit-score/history')]);
      setScoreData(scoreRes.data.data);
      setHistory(historyRes.data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load credit score.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setRecalcLoading(true);
    setError(null);
    try {
      const res = await api.post('/credit-score/recalculate');
      setScoreData(res.data.data);
      await loadScore();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to recalculate score.');
    } finally {
      setRecalcLoading(false);
    }
  };

  const score = scoreData?.score ?? 0;
  const gaugePercent = useMemo(() => Math.min(100, Math.max(0, ((score - 300) / 600) * 100)), [score]);

  const factors = useMemo(() => {
    const list = scoreData?.factors || [];
    return list.map((f: any) => ({
      ...f,
      meta: FACTOR_LABELS[f.factor_name] || { label: f.factor_name, weight: `${Math.round((f.weight || 0) * 100)}%` },
    }));
  }, [scoreData]);

  const maxHistoryScore = useMemo(() => Math.max(...history.map((h) => h.score), score, 900), [history, score]);

  if (loading || !user) {
    return <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8">Loading data...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Credit Score</h1>
              <p className="mt-3 text-sm text-slate-600">Your RentCredit score, factor breakdown, and progression over time.</p>
            </div>
            <button onClick={() => router.push('/tenant')} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
              Back to dashboard
            </button>
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading data...</p>
        ) : (
          <>
            <RentalCreditModelCard />
            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Score gauge</h2>
                <div className="mt-8 flex flex-col items-center">
                  <div className="relative h-40 w-40">
                    <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                      <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        fill="none"
                        stroke="#dc2626"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${(gaugePercent / 100) * 327} 327`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold text-slate-900">{score}</span>
                      <span className={`text-sm font-semibold uppercase ${tierColors[scoreData?.tier] || 'text-slate-600'}`}>
                        {scoreData?.tier || '—'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleRecalculate}
                    disabled={recalcLoading}
                    className="mt-6 rounded-2xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
                  >
                    {recalcLoading ? 'Recalculating score...' : 'Recalculate score'}
                  </button>
                </div>
                {scoreData?.milestone ? (
                  <div className="mt-8 rounded-2xl bg-slate-50 p-5">
                    <p className="text-sm font-semibold text-slate-900">Next milestone</p>
                    <p className="mt-2 text-sm text-slate-600">{scoreData.milestone.message}</p>
                    {scoreData.milestone.nextTier ? (
                      <p className="mt-2 text-xs text-slate-500">
                        {scoreData.milestone.pointsNeeded} points to {scoreData.milestone.nextTier}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Factor breakdown</h2>
                <p className="mt-2 text-sm text-slate-500">Weighted model: 35% / 20% / 20% / 15% / 10%.</p>
                <div className="mt-6 space-y-4">
                  {factors.length ? (
                    factors.map((factor: any) => (
                      <div key={factor.factor_name} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-slate-900">{factor.meta.label}</p>
                            <p className="text-xs text-slate-500">Weight {factor.meta.weight}</p>
                          </div>
                          <p className="text-sm font-semibold text-slate-700">
                            +{Number(factor.weighted_contribution || 0).toFixed(1)} pts
                          </p>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-brand-red"
                            style={{ width: `${Math.min(100, Number(factor.weighted_contribution || 0) * 2)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No factor data yet. Recalculate to generate a breakdown.</p>
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Score history</h2>
              <p className="mt-2 text-sm text-slate-500">Recent score snapshots over time.</p>
              {history.length ? (
                <div className="mt-8 flex items-end gap-2" style={{ minHeight: 160 }}>
                  {history.map((point, index) => (
                    <div key={`${point.recorded_at}-${index}`} className="flex flex-1 flex-col items-center gap-2">
                      <div
                        className="w-full max-w-[48px] rounded-t-lg bg-brand-red/80"
                        style={{ height: `${Math.max(12, (point.score / maxHistoryScore) * 140)}px` }}
                        title={`${point.score} (${point.tier})`}
                      />
                      <p className="text-xs font-semibold text-slate-700">{point.score}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(point.recorded_at).toLocaleDateString(undefined, { month: 'short' })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">History will appear after your first score calculation.</p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
