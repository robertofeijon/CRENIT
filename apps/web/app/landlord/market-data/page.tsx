'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Database, MapPin, Percent, RefreshCw, TrendingUp, Users } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import LandlordPageHeader from '../../components/ui/LandlordPageHeader';
import LandlordStatCard from '../../components/ui/LandlordStatCard';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import { formatN$ } from '../../components/landlord/landlordUi';

function DataSourceBadge({
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

export default function LandlordMarketDataPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);
  const [suburbs, setSuburbs] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<'market_data_records' | 'market_data_snapshots' | 'mixed' | undefined>();
  const [dataSourceLabel, setDataSourceLabel] = useState<string | undefined>();
  const [selectedSuburb, setSelectedSuburb] = useState('');
  const [suburbDetails, setSuburbDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role && role !== 'LANDLORD' && role !== 'ADMIN') router.replace('/tenant/home');
  }, [loading, user, role, router]);

  const loadMarketData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryRes, suburbsRes] = await Promise.all([api.get('/market-data/summary'), api.get('/market-data/suburbs')]);
      setSummary(summaryRes.data.data);
      setDataSource(summaryRes.data.data?.data_source ?? suburbsRes.data.meta?.data_source);
      setDataSourceLabel(summaryRes.data.data?.data_source_label ?? suburbsRes.data.meta?.data_source_label);
      const list = suburbsRes.data.data || [];
      setSuburbs(list);
      setSelectedSuburb((prev) =>
        prev && list.some((s: { suburb: string }) => s.suburb === prev) ? prev : list[0]?.suburb ?? '',
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load market data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSuburbDetails = useCallback(async (suburb: string) => {
    if (!suburb) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/market-data/suburbs/${encodeURIComponent(suburb)}`);
      setSuburbDetails(res.data.data);
      if (res.data.data?.data_source) setDataSource(res.data.data.data_source);
      if (res.data.data?.data_source_label) setDataSourceLabel(res.data.data.data_source_label);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load suburb details.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && (role === 'LANDLORD' || role === 'ADMIN')) void loadMarketData();
  }, [user, role, loadMarketData]);

  useEffect(() => {
    if (selectedSuburb) void loadSuburbDetails(selectedSuburb);
  }, [selectedSuburb, loadSuburbDetails]);

  if (loading || !user) {
    return <p className="text-sm text-slate-500">Loading partner workspace…</p>;
  }

  return (
    <div className="space-y-6">
      <LandlordPageHeader
        badge="Intelligence"
        title="Market intelligence"
        subtitle="Same verified rental data as CRENIT B2B products — paid rent and payment behaviour by suburb."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DataSourceBadge dataSource={dataSource} label={dataSourceLabel} />
            <button type="button" onClick={() => void loadMarketData()} disabled={isLoading} className="landlord-btn-secondary">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
              Refresh
            </button>
          </div>
        }
      />

      {dataSourceLabel ? (
        <p className="text-sm text-slate-600">
          Source: <span className="font-medium text-[#1A1A1A]">{dataSourceLabel}</span>
          {summary?.pipeline_updated_at
            ? ` · Last verified capture ${new Date(summary.pipeline_updated_at).toLocaleString()}`
            : null}
        </p>
      ) : null}

      {error ? <ErrorStateCard message={error} onRetry={loadMarketData} /> : null}

      {summary ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <LandlordStatCard label="Suburbs tracked" value={summary.suburb_count} icon={MapPin} />
          <LandlordStatCard label="Median rent" value={formatN$(summary.median_rent || summary.average_rent)} icon={TrendingUp} accent="dark" />
          <LandlordStatCard label="On-time rate" value={`${Math.round(Number(summary.on_time_rate || 0))}%`} icon={Percent} accent="success" />
          <LandlordStatCard label="Verified samples" value={summary.total_sample_count} icon={Users} />
        </section>
      ) : null}

      <section className="landlord-panel">
        <h2 className="text-lg font-semibold text-[#1A1A1A]">Suburb explorer</h2>
        {isLoading && !suburbs.length ? (
          <div className="mt-4">
            <SkeletonBlocks rows={4} />
          </div>
        ) : suburbs.length ? (
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {suburbs.map((entry) => (
                <button
                  key={`${entry.suburb}-${entry.city}`}
                  type="button"
                  onClick={() => setSelectedSuburb(entry.suburb)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                    selectedSuburb === entry.suburb
                      ? 'border-[#C0392B] bg-[#FDEDEC] text-[#1A1A1A]'
                      : 'border-slate-100 bg-[#F3F4F6] text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <p className="font-semibold">
                    {entry.suburb}
                    {entry.commercially_licensable ? (
                      <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                        Licensable
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs opacity-80">
                    {entry.city} · {formatN$(entry.median_rent ?? entry.avg_rent)} median
                    {entry.on_time_rate != null ? ` · ${Math.round(Number(entry.on_time_rate))}% on-time` : ''}
                    {entry.confidence_level ? ` · ${entry.confidence_level}` : ''}
                    {entry.sample_count ? ` · n=${entry.sample_count}` : ''}
                  </p>
                </button>
              ))}
            </div>
            {suburbDetails?.minimum_sample_not_met ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
                <p className="font-semibold">Not enough verified payments yet</p>
                <p className="mt-2">
                  {suburbDetails.suburb} has {suburbDetails.transaction_count ?? 0} sample
                  {(suburbDetails.required_minimum_sample ?? 5) > 1 ? 's' : ''} — need at least{' '}
                  {suburbDetails.required_minimum_sample ?? 5} for benchmarks.
                </p>
              </div>
            ) : suburbDetails ? (
              <div className="rounded-xl border border-slate-100 bg-[#F3F4F6] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-lg font-semibold text-[#1A1A1A]">
                    {suburbDetails.suburb}, {suburbDetails.city}
                  </p>
                  <DataSourceBadge dataSource={suburbDetails.data_source} />
                </div>
                <p className="mt-2 text-sm capitalize text-slate-600">Trend: {suburbDetails.trend}</p>
                {suburbDetails.licensing_notice ? (
                  <p className="mt-2 text-xs text-slate-500">{suburbDetails.licensing_notice}</p>
                ) : null}
                {suburbDetails.pricing_guidance ? (
                  <p className="mt-2 text-xs text-slate-600">{suburbDetails.pricing_guidance}</p>
                ) : null}
                {Array.isArray(suburbDetails.recommended_use_cases) && suburbDetails.recommended_use_cases.length ? (
                  <ul className="mt-3 list-inside list-disc text-xs text-slate-600">
                    {suburbDetails.recommended_use_cases.map((use: string) => (
                      <li key={use}>{use}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <p className="text-sm">Median rent: {formatN$(suburbDetails.latest_snapshot?.median_rent)}</p>
                  <p className="text-sm">
                    Range: {formatN$(suburbDetails.latest_snapshot?.min_rent)} – {formatN$(suburbDetails.latest_snapshot?.max_rent)}
                  </p>
                  <p className="text-sm">
                    On-time payments:{' '}
                    {suburbDetails.on_time_rate != null || suburbDetails.latest_snapshot?.on_time_rate != null
                      ? `${Math.round(Number(suburbDetails.on_time_rate ?? suburbDetails.latest_snapshot?.on_time_rate))}%`
                      : '—'}
                  </p>
                  <p className="text-sm">Samples: {suburbDetails.latest_snapshot?.sample_count}</p>
                  <p className="text-sm">
                    Confidence: {suburbDetails.confidence_level || '—'}
                  </p>
                </div>
                {suburbDetails.intelligence?.rent_distribution?.length ? (
                  <div className="mt-5">
                    <p className="text-sm font-semibold text-[#1A1A1A]">Rent distribution</p>
                    <div className="mt-3 flex items-end gap-1" style={{ minHeight: 64 }}>
                      {suburbDetails.intelligence.rent_distribution.map((bucket: { range: string; count: number }) => {
                        const max = Math.max(
                          ...suburbDetails.intelligence.rent_distribution.map((b: { count: number }) => b.count),
                          1,
                        );
                        return (
                          <div
                            key={bucket.range}
                            className="flex flex-1 flex-col items-center gap-1"
                            title={`${bucket.range}: ${bucket.count}`}
                          >
                            <div
                              className="w-full rounded-t bg-slate-600/70"
                              style={{ height: `${Math.max(6, (bucket.count / max) * 48)}px` }}
                            />
                            <span className="text-[9px] text-slate-500 leading-tight text-center">
                              {bucket.range.replace('N$', '').replace('k', 'k')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {suburbDetails.intelligence?.bedroom_breakdown?.length ? (
                  <div className="mt-5">
                    <p className="text-sm font-semibold text-[#1A1A1A]">Rent by bedroom</p>
                    <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                      {suburbDetails.intelligence.bedroom_breakdown.map((row: any) => (
                        <li key={row.bedrooms} className="flex justify-between gap-4">
                          <span>{row.label}</span>
                          <span className="font-medium text-[#1A1A1A]">
                            {row.avg_rent != null ? formatN$(row.avg_rent) : '—'}
                            {row.sample_count ? ` · n=${row.sample_count}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {suburbDetails.intelligence?.income_to_rent_distribution?.length ? (
                  <div className="mt-5">
                    <p className="text-sm font-semibold text-[#1A1A1A]">Income bands (consented tenants)</p>
                    <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                      {suburbDetails.intelligence.income_to_rent_distribution.map((row: any) => (
                        <li key={row.bracket} className="flex justify-between gap-4">
                          <span>{row.bracket}</span>
                          <span className="font-medium text-[#1A1A1A]">{row.count} payments</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {suburbDetails.intelligence?.on_time_trend?.length ? (
                  <div className="mt-6">
                    <p className="text-sm font-semibold text-[#1A1A1A]">On-time payments by month</p>
                    <div className="mt-3 flex items-end gap-1" style={{ minHeight: 72 }}>
                      {suburbDetails.intelligence.on_time_trend.slice(-8).map((point: { month: string; on_time_rate: number }) => (
                        <div key={point.month} className="flex flex-1 flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t bg-emerald-600/80"
                            style={{ height: `${Math.max(6, (Number(point.on_time_rate) / 100) * 64)}px` }}
                            title={`${point.month}: ${point.on_time_rate}%`}
                          />
                          <span className="text-[10px] text-slate-500">{point.month.slice(5)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {suburbDetails.price_history?.length ? (
                  <div className="mt-6">
                    <p className="text-sm font-semibold text-[#1A1A1A]">Avg rent by month</p>
                    <div className="mt-3 flex items-end gap-1" style={{ minHeight: 120 }}>
                    {suburbDetails.price_history.slice(-8).map((point: any, i: number) => (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t bg-[#C0392B]/80"
                          style={{
                            height: `${Math.max(
                              8,
                              (Number(point.avg_rent) /
                                Number(suburbDetails.latest_snapshot?.max_rent || point.avg_rent || 1)) *
                                80,
                            )}px`,
                          }}
                        />
                        <span className="text-[10px] text-slate-500">{point.snapshot_date?.slice(5, 7)}</span>
                      </div>
                    ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyStateCard title="Select a suburb" description="Choose a suburb from the list to view details." />
            )}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyStateCard
              title="No market data yet"
              description="Benchmarks appear after verified rent payments are captured with market data consent."
            />
          </div>
        )}
      </section>
    </div>
  );
}
