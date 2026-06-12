'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, TrendingUp } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import TenantPageHeader from '../../components/ui/TenantPageHeader';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import { TenantWorkspaceLoading } from '../../components/ui/WorkspaceLoading';
import RentalCreditModelCard from '../../components/credit/RentalCreditModelCard';
import ScoreTierProgress from '../../components/credit/ScoreTierProgress';
import { BRAND_TIER_COLORS, type BrandTier } from '../../../src/lib/tier-branding';

const FACTOR_LABELS: Record<string, { label: string; weight: string }> = {
  payment_history: { label: 'Payment history', weight: '50%' },
  amount_defaulted: { label: 'Amount defaulted on', weight: '30%' },
  history_length: { label: 'Length of credit history', weight: '20%' },
};

const tierColors: Record<string, string> = {
  EXCELLENT: 'text-emerald-600',
  GOOD: 'text-blue-600',
  FAIR: 'text-amber-600',
  BUILDING: 'text-slate-600',
};

export default function TenantCreditScorePage() {
  const { user, loading, roleReady } = useAuth();
  const router = useRouter();
  const [scoreData, setScoreData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const [simMonths, setSimMonths] = useState(6);
  const [simulation, setSimulation] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && roleReady && !user) router.replace('/auth');
    if (!loading && roleReady && user) void loadScore();
  }, [loading, roleReady, user, router]);

  const loadScore = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [scoreRes, historyRes, insightsRes] = await Promise.all([
        api.get('/credit-score/me'),
        api.get('/credit-score/history'),
        api.get('/credit-score/insights'),
      ]);
      setScoreData(scoreRes.data.data);
      setHistory(historyRes.data.data || []);
      setInsights(insightsRes.data.data);
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
      setError(err?.response?.data?.message || 'Unable to recalculate score.');
    } finally {
      setRecalcLoading(false);
    }
  };

  const score = scoreData?.score ?? 0;
  const score100 = scoreData?.score_100 ?? Math.round(((score - 300) / 600) * 1000) / 10;
  const riskTier = scoreData?.risk_tier ?? 'MODERATE';
  const brandTier = scoreData?.brand_tier ?? insights?.brand_tier;
  const tierProgress = scoreData?.tier_progress ?? insights?.tier_progress;

  const runSimulation = async () => {
    setSimLoading(true);
    try {
      const res = await api.post('/credit-score/simulate', { months_on_time: simMonths });
      setSimulation(res.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Simulation failed');
    } finally {
      setSimLoading(false);
    }
  };
  const gaugePercent = useMemo(() => Math.min(100, Math.max(0, score100)), [score100]);
  const breakdown = scoreData?.breakdown;
  const paymentMetrics = scoreData?.paymentMetrics;

  const factors = useMemo(() => {
    const list = scoreData?.factors || [];
    return list.map((f: any) => ({
      ...f,
      meta: FACTOR_LABELS[f.factor_name] || { label: f.factor_name, weight: `${Math.round((f.weight || 0) * 100)}%` },
    }));
  }, [scoreData]);

  const maxHistoryScore = useMemo(() => Math.max(...history.map((h) => h.score), score, 900), [history, score]);

  if (loading || !roleReady || !user) {
    return <TenantWorkspaceLoading />;
  }

  return (
    <div className="space-y-6">
      <TenantPageHeader
        badge="Credit"
        title="My credit score"
        subtitle="Your CRENIT rental credit score, factor breakdown, and progress over time."
        actions={
          <button type="button" onClick={() => void loadScore()} disabled={isLoading} className="tenant-btn-secondary">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        }
      />

      {error ? <ErrorStateCard message={error} onRetry={() => void loadScore()} /> : null}

      {isLoading ? (
        <SkeletonBlocks rows={5} />
      ) : (
        <>
          {paymentMetrics ? (
            <section className="tenant-panel grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-[#F3F4F6] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">On-time streak</p>
                <p className="mt-2 text-3xl font-semibold text-[#1A1A1A]">{paymentMetrics.consecutive_on_time_streak} months</p>
                <p className="mt-1 text-sm text-slate-600">Consecutive rent cycles paid on or before due date.</p>
              </div>
              <div className="rounded-xl bg-[#F3F4F6] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">On-time rate</p>
                <p className="mt-2 text-3xl font-semibold text-[#1A1A1A]">{paymentMetrics.on_time_rate_pct}%</p>
                <p className="mt-1 text-sm text-slate-600">
                  {paymentMetrics.on_time_payments_in_window} of {paymentMetrics.payments_in_window} payments in the last{' '}
                  {paymentMetrics.window_months} months.
                </p>
              </div>
            </section>
          ) : null}

          <ScoreTierProgress brandTier={brandTier} tierProgress={tierProgress} />

          {insights?.holding_back?.length ? (
            <section className="tenant-panel">
              <h2 className="text-lg font-semibold text-[#1A1A1A]">What&apos;s holding your score back</h2>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {insights.holding_back.map((line: string) => (
                  <li key={line.slice(0, 48)} className="rounded-xl bg-amber-50 px-4 py-3 text-amber-950">
                    {line}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="tenant-panel">
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Score simulator</h2>
            <p className="mt-2 text-sm text-slate-600">If you pay on time for the next few months, your tier could improve.</p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <label className="text-sm font-medium text-slate-700">
                Months on-time:{' '}
                <input
                  type="range"
                  min={0}
                  max={12}
                  value={simMonths}
                  onChange={(e) => setSimMonths(Number(e.target.value))}
                  className="ml-2 align-middle"
                />
                <span className="ml-2 font-semibold">{simMonths}</span>
              </label>
              <button type="button" className="tenant-btn-secondary" disabled={simLoading} onClick={() => void runSimulation()}>
                {simLoading ? 'Calculating…' : 'Project score'}
              </button>
            </div>
            {simulation ? (
              <p className="mt-4 rounded-xl bg-[#F3F4F6] px-4 py-3 text-sm text-slate-700">
                {simulation.current.brand_tier.label} ({simulation.current.score_100}) →{' '}
                <span className="font-semibold">{simulation.projected.brand_tier.label}</span> ({simulation.projected.score_100}
                , +{simulation.projected.points_gain} pts). <span className="text-slate-500">{simulation.disclaimer}</span>
              </p>
            ) : null}
          </section>

          <RentalCreditModelCard
            breakdown={{
              score100,
              paymentHistoryScore: breakdown?.paymentHistoryScore,
              defaultScore: breakdown?.defaultScore,
              historyScore: breakdown?.historyScore,
            }}
          />
          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <section className="tenant-panel">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#C0392B]" aria-hidden />
                <h2 className="text-lg font-semibold text-[#1A1A1A]">Score gauge</h2>
              </div>
              <div className="mt-8 flex flex-col items-center">
                <div className="relative h-40 w-40">
                  <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="#C0392B"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${(gaugePercent / 100) * 327} 327`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-[#1A1A1A]">{score100}</span>
                    <span className="text-xs text-slate-500">/ 100</span>
                    {brandTier ? (
                      <span className={`mt-1 rounded-full px-2 py-0.5 text-xs font-bold ${BRAND_TIER_COLORS[brandTier.id as BrandTier]}`}>
                        {brandTier.label}
                      </span>
                    ) : (
                      <span className={`mt-1 text-sm font-semibold uppercase ${tierColors[scoreData?.tier] || 'text-slate-600'}`}>
                        {riskTier.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
                <button type="button" className="tenant-btn-secondary mt-6" disabled={recalcLoading} onClick={() => void handleRecalculate()}>
                  {recalcLoading ? 'Recalculating…' : 'Recalculate score'}
                </button>
              </div>
              {scoreData?.milestone ? (
                <div className="mt-8 rounded-xl bg-[#F3F4F6] p-5">
                  <p className="text-sm font-semibold text-[#1A1A1A]">Next milestone</p>
                  <p className="mt-2 text-sm text-slate-600">{scoreData.milestone.message}</p>
                  {scoreData.milestone.nextTier ? (
                    <p className="mt-2 text-xs text-slate-500">
                      {scoreData.milestone.pointsNeeded} points to {scoreData.milestone.nextTier}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="tenant-panel">
              <h2 className="text-lg font-semibold text-[#1A1A1A]">Factor breakdown</h2>
              <p className="mt-2 text-sm text-slate-500">CRENIT model: payment history 50% · defaults 30% · history length 20%.</p>
              <div className="mt-6 space-y-4">
                {factors.length ? (
                  factors.map((factor: any) => (
                    <div key={factor.factor_name} className="rounded-xl bg-[#F3F4F6] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-[#1A1A1A]">{factor.meta.label}</p>
                          <p className="text-xs text-slate-500">Weight {factor.meta.weight}</p>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">+{Number(factor.weighted_contribution || 0).toFixed(1)} pts</p>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-[#C0392B]"
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

          <section className="tenant-panel">
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Score history</h2>
            {history.length ? (
              <div className="mt-8 flex items-end gap-2" style={{ minHeight: 160 }}>
                {history.map((point, index) => (
                  <div key={`${point.recorded_at}-${index}`} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full max-w-[48px] rounded-t-lg bg-[#C0392B]/80"
                      style={{ height: `${Math.max(12, (point.score / maxHistoryScore) * 140)}px` }}
                      title={`${point.score} (${point.tier})`}
                    />
                    <p className="text-xs font-semibold text-[#1A1A1A]">{point.score}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(point.recorded_at).toLocaleDateString(undefined, { month: 'short' })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">History appears after your first score calculation.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
