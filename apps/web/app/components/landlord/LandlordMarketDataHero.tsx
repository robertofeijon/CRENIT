'use client';

import { Database } from 'lucide-react';
import LandlordStatCard from '../ui/LandlordStatCard';
import { MapPin, Percent, TrendingUp, Users } from 'lucide-react';
import { formatN$ } from './landlordUi';

type LandlordMarketDataHeroProps = {
  summary: {
    suburb_count?: number;
    median_rent?: number;
    average_rent?: number;
    on_time_rate?: number;
    total_sample_count?: number;
    pipeline_updated_at?: string;
  };
  dataSource?: 'market_data_records' | 'market_data_snapshots' | 'mixed';
  dataSourceLabel?: string;
};

export function DataSourceBadge({
  dataSource,
  label,
}: {
  dataSource?: 'market_data_records' | 'market_data_snapshots' | 'mixed';
  label?: string;
}) {
  const verified = dataSource === 'market_data_records';
  const mixed = dataSource === 'mixed';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
        verified
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : mixed
            ? 'border-sky-200 bg-sky-50 text-sky-900'
            : 'border-amber-200 bg-amber-50 text-amber-900'
      }`}
      title={label}
    >
      <Database className="h-3.5 w-3.5" aria-hidden />
      {verified ? 'Verified payments' : mixed ? 'Mixed sources' : 'Snapshot fallback'}
    </span>
  );
}

export default function LandlordMarketDataHero({ summary, dataSource, dataSourceLabel }: LandlordMarketDataHeroProps) {
  const median = summary.median_rent || summary.average_rent;

  return (
    <section className="dashboard-hero shimmer-border space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <DataSourceBadge dataSource={dataSource} label={dataSourceLabel} />
          {summary.pipeline_updated_at ? (
            <span className="text-xs text-[var(--rc-text-muted)]">
              Updated {new Date(summary.pipeline_updated_at).toLocaleString()}
            </span>
          ) : null}
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#C0392B]">Portfolio benchmarks</p>
        <h2 className="dashboard-page-header__title-display mt-2">
          {formatN$(median)} <span className="text-2xl text-[var(--rc-text-secondary)]">median across suburbs</span>
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--rc-text-secondary)]">
          {dataSourceLabel || 'Verified rental intelligence'} — same aggregates licensed to banks and developers.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <LandlordStatCard label="Suburbs tracked" value={summary.suburb_count ?? 0} icon={MapPin} />
        <LandlordStatCard label="Median rent" value={formatN$(median)} icon={TrendingUp} accent="dark" />
        <LandlordStatCard
          label="On-time rate"
          value={`${Math.round(Number(summary.on_time_rate || 0))}%`}
          icon={Percent}
          accent="success"
        />
        <LandlordStatCard label="Verified samples" value={summary.total_sample_count ?? 0} icon={Users} />
      </div>
    </section>
  );
}
