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
import CreditScoreHero from '../../components/credit/CreditScoreHero';
import LandlordStatCard from '../../components/ui/LandlordStatCard';
import RentalCreditModelCard from '../../components/credit/RentalCreditModelCard';
import ScoreTierProgress from '../../components/credit/ScoreTierProgress';
import PaymentHistoryImportCard from '../../components/tenant/PaymentHistoryImportCard';

const FACTOR_LABELS: Record<string, { label: string; weight: string }> = {
  payment_history: { label: 'Payment history', weight: '50%' },
  amount_defaulted: { label: 'Amount defaulted on', weight: '30%' },
  history_length: { label: 'Length of credit history', weight: '20%' },
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
          <CreditScoreHero
            score={score}
            score100={score100}
            brandTier={brandTier}
            riskTier={riskTier}
            legacyTier={scoreData?.tier}
            onTimePct={paymentMetrics?.on_time_rate_pct}
            streak={paymentMetrics?.consecutive_on_time_streak}
            recalcLoading={recalcLoading}
            onRecalculate={() => void handleRecalculate()}
          />

          {paymentMetrics ? (
            <section className="grid gap-4 sm:grid-cols-2">
              <LandlordStatCard
                label="On-time streak"
                value={`${paymentMetrics.consecutive_on_time_streak} mo`}
                sub="Consecutive rent cycles paid on or before due date"
                icon={TrendingUp}
                accent="success"
              />
              <LandlordStatCard
                label="On-time rate"
                value={`${paymentMetrics.on_time_rate_pct}%`}
                sub={`${paymentMetrics.on_time_payments_in_window} of ${paymentMetrics.payments_in_window} payments in ${paymentMetrics.window_months} months`}
              />
            </section>
          ) : null}

          <ScoreTierProgress brandTier={brandTier} tierProgress={tierProgress} />

          {insights?.peer_comparison?.available ? (
            <section className="tenant-panel border-emerald-100 bg-emerald-50/50">
              <h2 className="text-lg font-semibold text-[#1A1A1A]">How you compare locally</h2>
              <p className="mt-2 text-sm text-emerald-950">{insights.peer_comparison.message}</p>
              <p className="mt-2 text-xs text-slate-500">
                Privacy-safe aggregate in {insights.peer_comparison.suburb} · n={insights.peer_comparison.sample_size} verified tenants
              </p>
            </section>
          ) : insights?.peer_comparison?.suppressed ? (
            <section className="tenant-panel">
              <h2 className="text-lg font-semibold text-[#1A1A1A]">How you compare locally</h2>
              <p className="mt-2 text-sm text-slate-600">
                {insights.peer_comparison.suburb
                  ? `We need at least ${insights.peer_comparison.required_minimum_sample ?? 5} verified tenants in ${insights.peer_comparison.suburb} before showing a suburb comparison.`
                  : 'Add a property suburb to your lease to unlock local comparisons.'}
              </p>
            </section>
          ) : null}

          {(insights?.lease_summaries?.length ?? 0) > 1 ? (
            <section className="tenant-panel">
              <h2 className="text-lg font-semibold text-[#1A1A1A]">Credit across your leases</h2>
              <p className="mt-1 text-sm text-slate-600">
                One unified score — events below are labelled by landlord and property.
              </p>
              <ul className="mt-4 space-y-2">
                {insights.lease_summaries.map((lease: any) => (
                  <li key={lease.lease_id} className="rounded-xl border border-slate-100 bg-[#F3F4F6] px-4 py-3 text-sm">
                    <p className="font-semibold text-[#1A1A1A]">{lease.property_label}</p>
                    <p className="text-slate-600">
                      {lease.landlord_name} · {lease.status} · {lease.confirmed_payments} confirmed payment
                      {lease.confirmed_payments === 1 ? '' : 's'}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

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
              {scoreData?.milestone ? (
                <div className="dashboard-hero__stat">
                  <p className="dashboard-hero__stat-label">Next milestone</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--rc-text)]">{scoreData.milestone.message}</p>
                  {scoreData.milestone.nextTier ? (
                    <p className="mt-2 text-xs text-[var(--rc-text-muted)]">
                      {scoreData.milestone.pointsNeeded} points to {scoreData.milestone.nextTier}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-[var(--rc-text-muted)]">Milestones appear as your score improves.</p>
              )}
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

          <PaymentHistoryImportCard />

          <section className="tenant-panel">
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Score timeline</h2>
            <p className="mt-1 text-sm text-slate-500">What moved your score — stored with each update, not guessed on the fly.</p>
            {(insights?.narrative_timeline?.length ? insights.narrative_timeline : history.filter((h) => h.event_reason)).length ? (
              <ul className="mt-4 space-y-3">
                {(insights?.narrative_timeline?.length
                  ? insights.narrative_timeline
                  : history.filter((h) => h.event_reason)
                ).map((entry: any, index: number) => (
                  <li key={`${entry.recorded_at}-${index}`} className="flex gap-3 rounded-xl border border-slate-100 bg-[#F3F4F6] px-4 py-3 text-sm">
                    <div className="shrink-0 text-xs text-slate-500">
                      {new Date(entry.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div>
                      {entry.landlord_name || entry.property_label ? (
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {[entry.property_label, entry.landlord_name].filter(Boolean).join(' · ')}
                        </p>
                      ) : null}
                      <p className="font-medium text-[#1A1A1A]">{entry.annotation || entry.event_reason}</p>
                      {entry.score != null ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Score {entry.score}
                          {entry.score_delta != null && entry.score_delta !== 0 ? ` (${entry.score_delta > 0 ? '+' : ''}${entry.score_delta})` : ''}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Annotations appear when rent is confirmed, auto-confirmed, or disputes resolve.</p>
            )}
          </section>

          <section className="tenant-panel">
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Score history</h2>
            {history.length ? (
              <div className="mt-8 flex items-end gap-2" style={{ minHeight: 160 }}>
                {history.map((point, index) => (
                  <div key={`${point.recorded_at}-${index}`} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="score-history-bar"
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
