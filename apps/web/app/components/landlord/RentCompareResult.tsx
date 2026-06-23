'use client';

import { ArrowDown, ArrowUp, Minus, Scale } from 'lucide-react';
import { formatN$ } from './landlordUi';

type RentCompareResultProps = {
  result: any;
};

export default function RentCompareResult({ result }: RentCompareResultProps) {
  if (!result) return null;

  if (result.minimum_sample_not_met) {
    return (
      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950">
        <p className="font-semibold">Insufficient verified samples</p>
        <p className="mt-2">{result.licensing_notice || 'Benchmarks need more confirmed payments in this suburb.'}</p>
      </div>
    );
  }

  const yourRent = Number(result.your_monthly_rent || 0);
  const median = Number(result.suburb_benchmark?.median_rent || 0);
  const min = Number(result.suburb_benchmark?.min_rent || 0);
  const max = Number(result.suburb_benchmark?.max_rent || median || 1);
  const vsPct = result.comparison?.vs_median_pct;
  const rangeSpan = Math.max(max - min, 1);
  const yourPos = Math.min(100, Math.max(0, ((yourRent - min) / rangeSpan) * 100));
  const medianPos = Math.min(100, Math.max(0, ((median - min) / rangeSpan) * 100));

  const TrendIcon = vsPct == null || vsPct === 0 ? Minus : vsPct > 0 ? ArrowUp : ArrowDown;
  const trendClass =
    vsPct == null || vsPct === 0 ? 'text-[var(--rc-text-secondary)]' : vsPct > 0 ? 'text-amber-700' : 'text-emerald-700';

  return (
    <div className="mt-5 marketing-metal-card rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {result.unit_label ? <p className="font-semibold text-[var(--rc-text)]">{result.unit_label}</p> : null}
          <p className="mt-1 text-sm text-[var(--rc-text-secondary)]">
            {result.suburb}, {result.city}
          </p>
        </div>
        {vsPct != null ? (
          <span className={`inline-flex items-center gap-1 rounded-full bg-[var(--rc-card-alt)] px-3 py-1 text-sm font-semibold ${trendClass}`}>
            <TrendIcon className="h-4 w-4" aria-hidden />
            {vsPct > 0 ? '+' : ''}
            {vsPct}% vs median
          </span>
        ) : null}
      </div>

      <div className="mt-6">
        <div className="relative h-3 rounded-full bg-[var(--rc-border)]">
          <div
            className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-[#C0392B] shadow-md"
            style={{ left: `calc(${yourPos}% - 8px)` }}
            title={`Your rent ${formatN$(yourRent)}`}
          />
          <div
            className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-[#1a1a2e]"
            style={{ left: `${medianPos}%` }}
            title={`Median ${formatN$(median)}`}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-[var(--rc-text-muted)]">
          <span>{formatN$(min)}</span>
          <span className="flex items-center gap-1">
            <Scale className="h-3 w-3" aria-hidden />
            Median {formatN$(median)}
          </span>
          <span>{formatN$(max)}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="dashboard-hero__stat">
          <p className="dashboard-hero__stat-label">Your rent</p>
          <p className="dashboard-hero__stat-value">{formatN$(yourRent)}</p>
        </div>
        <div className="dashboard-hero__stat">
          <p className="dashboard-hero__stat-label">Suburb median</p>
          <p className="dashboard-hero__stat-value">{formatN$(median)}</p>
        </div>
        <div className="dashboard-hero__stat">
          <p className="dashboard-hero__stat-label">Samples</p>
          <p className="dashboard-hero__stat-value">n={result.suburb_benchmark?.transaction_count ?? '—'}</p>
        </div>
      </div>

      {result.comparison?.assessment ? (
        <p className="mt-4 rounded-xl bg-[var(--rc-accent-surface)] px-4 py-3 text-sm leading-6 text-[var(--rc-text)]">
          {result.comparison.assessment}
        </p>
      ) : null}
    </div>
  );
}
