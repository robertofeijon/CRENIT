'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, MapPin } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import AdminChartCard from './AdminChartCard';
import AdminHealthPanel from './AdminHealthPanel';
import EmptyStateCard from '../ui/EmptyStateCard';
import SkeletonBlocks from '../ui/SkeletonBlocks';

export type SuburbExplorerRow = {
  suburb: string;
  transaction_count: number;
  median_rent: number;
  price_range?: { min: number; max: number; median: number };
  on_time_rate: number;
  trend: string;
  confidence_level?: string;
  commercially_licensable?: boolean;
};

export type SuburbExplorerDetail = {
  suburb: string;
  transaction_count: number;
  price_range?: { min: number; max: number; median: number };
  pricing_guidance?: string;
  confidence_level?: string;
  licensing_notice?: string;
  rent_distribution: { range: string; count: number }[];
  on_time_trend: { month: string; on_time_rate: number }[];
  bedroom_breakdown?: { label: string; avg_rent: number | null; sample_count: number }[];
};

type SortKey = 'suburb' | 'median_rent' | 'transaction_count' | 'on_time_rate';
type SortDir = 'asc' | 'desc';

const SORTABLE: SortKey[] = ['suburb', 'median_rent', 'transaction_count', 'on_time_rate'];

const SORT_LABELS: Record<SortKey, string> = {
  suburb: 'suburb name',
  median_rent: 'median rent',
  transaction_count: 'sample size',
  on_time_rate: 'on-time rate',
};

function ConfidenceBadge({ level }: { level?: string }) {
  const styles =
    level === 'high'
      ? 'bg-emerald-100 text-emerald-800'
      : level === 'moderate'
        ? 'bg-sky-100 text-sky-800'
        : level === 'low'
          ? 'bg-amber-100 text-amber-900'
          : 'bg-slate-100 text-slate-600';
  const label = level ? level.charAt(0).toUpperCase() + level.slice(1) : '—';
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${styles}`}>{label}</span>;
}

function TrendBadge({ trend }: { trend: string }) {
  const colors =
    trend === 'Rising'
      ? 'bg-emerald-100 text-emerald-800'
      : trend === 'Falling'
        ? 'bg-rose-100 text-rose-800'
        : 'bg-slate-100 text-slate-700';
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${colors}`}>{trend}</span>;
}

function LicenseBadge({ ready }: { ready?: boolean }) {
  return ready ? (
    <span className="admin-status-pill admin-status-pill--ok">Ready to sell</span>
  ) : (
    <span className="admin-status-pill admin-status-pill--warn">Directional</span>
  );
}

function RentRangeViz({ min, max, median, scaleMax }: { min: number; max: number; median: number; scaleMax: number }) {
  const safeMax = Math.max(scaleMax, max, 1);
  const left = (min / safeMax) * 100;
  const width = Math.max(((max - min) / safeMax) * 100, 4);
  const medianPos = ((median - min) / Math.max(max - min, 1)) * 100;

  return (
    <div className="space-y-1.5">
      <p className="text-xs tabular-nums text-[var(--rc-text-secondary)]">
        N${min.toLocaleString()} – N${max.toLocaleString()}
      </p>
      <div className="admin-range-bar">
        <div className="admin-range-bar__fill" style={{ left: `${left}%`, width: `${width}%` }} />
        <div
          className="absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 rounded-full bg-white shadow"
          style={{ left: `calc(${left}% + ${(width * medianPos) / 100}%)` }}
          aria-hidden
        />
      </div>
    </div>
  );
}

function OnTimeBar({ rate }: { rate: number }) {
  const fillClass = rate >= 80 ? 'admin-rate-bar__fill--high' : rate >= 60 ? 'admin-rate-bar__fill--mid' : 'admin-rate-bar__fill--low';
  return (
    <div className="min-w-[4.5rem] space-y-1">
      <p className="text-xs font-semibold tabular-nums text-[var(--rc-text)]">{rate}%</p>
      <div className="admin-rate-bar">
        <div className={`admin-rate-bar__fill ${fillClass}`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-50" aria-hidden />;
  return dir === 'asc' ? (
    <ArrowUp className="ml-1 inline h-3 w-3" aria-hidden />
  ) : (
    <ArrowDown className="ml-1 inline h-3 w-3" aria-hidden />
  );
}

export default function AdminSuburbExplorer({
  suburbs,
  selectedSuburb,
  suburbDetail,
  loading,
  onSelectSuburb,
}: {
  suburbs: SuburbExplorerRow[];
  selectedSuburb: string | null;
  suburbDetail: SuburbExplorerDetail | null;
  loading: boolean;
  onSelectSuburb: (name: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('suburb');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const scaleMax = useMemo(
    () => Math.max(...suburbs.map((row) => row.price_range?.max ?? row.median_rent), 0),
    [suburbs],
  );

  const sortedSuburbs = useMemo(() => {
    const copy = [...suburbs];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'suburb') cmp = a.suburb.localeCompare(b.suburb);
      else if (sortKey === 'median_rent') cmp = a.median_rent - b.median_rent;
      else if (sortKey === 'transaction_count') cmp = a.transaction_count - b.transaction_count;
      else cmp = a.on_time_rate - b.on_time_rate;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [suburbs, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'suburb' ? 'asc' : 'desc');
    }
  };

  if (loading && !suburbs.length) return <SkeletonBlocks rows={4} />;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-[var(--rc-text-secondary)]">
          Verified <strong className="text-[var(--rc-text)]">rental</strong> price ranges for client reports, feasibility,
          and asking-rent decisions. Not sale deed data.
        </p>
        {suburbs.length ? (
          <span className="admin-status-pill bg-slate-100 text-slate-700">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {suburbs.length} suburbs in view
          </span>
        ) : null}
      </div>

      {!suburbs.length ? (
        <EmptyStateCard
          title="No suburbs in view"
          description="Adjust filters or run supabase/seed.sql to load market_data_snapshots."
        />
      ) : (
        <div className="admin-data-table admin-data-table--scrollable">
          <div className="admin-data-table__scroll admin-data-table__scroll--sticky">
            <table className="w-full min-w-[56rem] text-left">
              <thead>
                <tr>
                  {(
                    [
                      { key: 'suburb' as SortKey, label: 'Suburb' },
                      { key: null, label: 'Rent range (verified)' },
                      { key: 'median_rent' as SortKey, label: 'Median' },
                      { key: 'transaction_count' as SortKey, label: 'Sample' },
                      { key: null, label: 'Confidence' },
                      { key: 'on_time_rate' as SortKey, label: 'On-time' },
                      { key: null, label: 'Trend' },
                      { key: null, label: 'License' },
                    ] as const
                  ).map((col) => {
                    const sortable = col.key && SORTABLE.includes(col.key);
                    const active = col.key === sortKey;
                    return (
                      <th
                        key={col.label}
                        className={`admin-data-table__th ${sortable ? 'admin-data-table__th--sortable' : ''} ${active ? 'admin-data-table__th--active' : ''}`}
                        onClick={sortable && col.key ? () => toggleSort(col.key as SortKey) : undefined}
                        aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                      >
                        {col.label}
                        {sortable && col.key ? <SortIcon active={active} dir={sortDir} /> : null}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="admin-data-table__body">
                {sortedSuburbs.map((row) => (
                  <tr
                    key={row.suburb}
                    onClick={() => onSelectSuburb(row.suburb)}
                    className={`admin-data-table__row ${selectedSuburb === row.suburb ? 'admin-data-table__row--selected' : ''}`}
                  >
                    <td className="admin-data-table__td admin-data-table__td--primary">
                      <span className="admin-data-table__suburb">{row.suburb}</span>
                    </td>
                    <td className="admin-data-table__td">
                      {row.price_range ? (
                        <RentRangeViz
                          min={row.price_range.min}
                          max={row.price_range.max}
                          median={row.price_range.median}
                          scaleMax={scaleMax}
                        />
                      ) : (
                        <span className="text-xs tabular-nums">N${row.median_rent.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="admin-data-table__td tabular-nums">N${row.median_rent.toLocaleString()}</td>
                    <td className="admin-data-table__td tabular-nums">{row.transaction_count}</td>
                    <td className="admin-data-table__td">
                      <ConfidenceBadge level={row.confidence_level} />
                    </td>
                    <td className="admin-data-table__td">
                      <OnTimeBar rate={row.on_time_rate} />
                    </td>
                    <td className="admin-data-table__td">
                      <TrendBadge trend={row.trend} />
                    </td>
                    <td className="admin-data-table__td">
                      <LicenseBadge ready={row.commercially_licensable} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="admin-data-table__footer">
            Sorted by {SORT_LABELS[sortKey]} ({sortDir === 'asc' ? 'A→Z / low→high' : 'Z→A / high→low'}). Click a
            suburb row to load rent distribution and on-time trend below.
            {selectedSuburb ? (
              <>
                {' '}
                · Selected: <strong className="text-[var(--rc-text)]">{selectedSuburb}</strong>
              </>
            ) : null}
          </p>
        </div>
      )}

      {suburbDetail?.rent_distribution ? (
        <div className="space-y-6 border-t border-[var(--rc-border)] pt-8">
          {suburbDetail.price_range ? (
            <AdminHealthPanel
              title={`${suburbDetail.suburb} — verified rental band`}
              subtitle={`N$${suburbDetail.price_range.min.toLocaleString()} – N$${suburbDetail.price_range.max.toLocaleString()} · Median N$${suburbDetail.price_range.median.toLocaleString()} · ${suburbDetail.transaction_count} records`}
              icon={MapPin}
              badge={<ConfidenceBadge level={suburbDetail.confidence_level} />}
            >
              {suburbDetail.pricing_guidance ? (
                <p className="text-xs leading-5 text-[var(--rc-text-secondary)]">{suburbDetail.pricing_guidance}</p>
              ) : null}
              {suburbDetail.licensing_notice ? (
                <p className="mt-2 text-xs font-medium text-[#C0392B]">{suburbDetail.licensing_notice}</p>
              ) : null}
            </AdminHealthPanel>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <AdminChartCard title="Rent distribution" subtitle="What clients buy — verified payment bands">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={suburbDetail.rent_distribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1A1A1A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </AdminChartCard>

            <AdminChartCard title="On-time rate trend" subtitle="Payment behaviour over recent months">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={suburbDetail.on_time_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(v) => [`${v}%`, 'On-time']} />
                    <Line type="monotone" dataKey="on_time_rate" stroke="#C0392B" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </AdminChartCard>
          </div>

          {suburbDetail.bedroom_breakdown?.length ? (
            <div className="admin-data-table">
              <div className="admin-data-table__scroll">
                <table className="w-full min-w-[24rem] text-left">
                  <thead>
                    <tr>
                      <th className="admin-data-table__th">Bedrooms</th>
                      <th className="admin-data-table__th">Avg verified rent</th>
                      <th className="admin-data-table__th">Sample</th>
                    </tr>
                  </thead>
                  <tbody className="admin-data-table__body">
                    {suburbDetail.bedroom_breakdown.map((row) => (
                      <tr key={row.label} className="admin-data-table__row--static">
                        <td className="admin-data-table__td admin-data-table__td--primary">{row.label}</td>
                        <td className="admin-data-table__td tabular-nums">
                          {row.avg_rent != null ? `N$${row.avg_rent.toLocaleString()}` : '—'}
                        </td>
                        <td className="admin-data-table__td tabular-nums">{row.sample_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="admin-data-table__footer">Bedroom mix for selected suburb</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
