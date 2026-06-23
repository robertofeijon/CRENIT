'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MapPin, RefreshCw, Scale } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import LandlordPageHeader from '../../components/ui/LandlordPageHeader';
import LandlordMarketDataHero, { DataSourceBadge } from '../../components/landlord/LandlordMarketDataHero';
import RentCompareResult from '../../components/landlord/RentCompareResult';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import { LandlordWorkspaceLoading } from '../../components/ui/WorkspaceLoading';
import { formatN$, landlordInputClass, landlordSelectClass } from '../../components/landlord/landlordUi';

const LazySuburbCharts = dynamic(() => import('../../components/charts/LandlordSuburbIntelligenceCharts'), {
  ssr: false,
  loading: () => <SkeletonBlocks rows={2} />,
});

export default function LandlordMarketDataPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);
  const [suburbs, setSuburbs] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<'market_data_records' | 'market_data_snapshots' | 'mixed' | undefined>();
  const [dataSourceLabel, setDataSourceLabel] = useState<string | undefined>();
  const [selectedSuburb, setSelectedSuburb] = useState('');
  const [suburbDetails, setSuburbDetails] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [compareUnitId, setCompareUnitId] = useState('');
  const [compareSuburb, setCompareSuburb] = useState('');
  const [compareRent, setCompareRent] = useState('');
  const [compareResult, setCompareResult] = useState<any>(null);
  const [saleComps, setSaleComps] = useState<any>(null);
  const [licensableAlerts, setLicensableAlerts] = useState<any[]>([]);
  const [compareBusy, setCompareBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unitOptions = properties.flatMap((p: any) =>
    (p.units ?? []).map((u: any) => ({
      id: u.id,
      label: `${p.property_name} — ${u.unit_identifier || 'Unit'} (${p.address_suburb})`,
      suburb: p.address_suburb,
      rent: u.monthly_rent,
    })),
  );

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role && role !== 'LANDLORD' && role !== 'ADMIN') router.replace('/tenant/home');
  }, [loading, user, role, router]);

  const loadMarketData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryRes, suburbsRes, alertsRes] = await Promise.all([
        api.get('/market-data/summary'),
        api.get('/market-data/suburbs'),
        api.get('/market-data/licensable-alerts'),
      ]);
      setLicensableAlerts(alertsRes.data.data?.alerts ?? []);
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
    setSaleComps(null);
    try {
      const [detailRes, saleRes] = await Promise.all([
        api.get(`/market-data/suburbs/${encodeURIComponent(suburb)}`),
        api.get(`/market-data/suburbs/${encodeURIComponent(suburb)}/sale-comps`).catch(() => null),
      ]);
      setSuburbDetails(detailRes.data.data);
      if (detailRes.data.data?.data_source) setDataSource(detailRes.data.data.data_source);
      if (detailRes.data.data?.data_source_label) setDataSourceLabel(detailRes.data.data.data_source_label);
      const saleData = saleRes?.data?.data;
      if (saleData && saleData.status !== 'no_sale_comps' && (saleData.transfer_count ?? 0) > 0) {
        setSaleComps(saleData);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load suburb details.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadProperties = useCallback(async () => {
    try {
      const res = await api.get('/landlords/properties');
      setProperties(res.data.data || []);
    } catch {
      setProperties([]);
    }
  }, []);

  const runCompare = useCallback(async () => {
    setCompareBusy(true);
    setCompareResult(null);
    try {
      const params: Record<string, string> = {};
      if (compareUnitId) params.unit_id = compareUnitId;
      if (compareSuburb) params.suburb = compareSuburb;
      if (compareRent) params.rent_amount = compareRent;
      const res = await api.get('/market-data/compare', { params });
      setCompareResult(res.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Compare failed.');
    } finally {
      setCompareBusy(false);
    }
  }, [compareUnitId, compareSuburb, compareRent]);

  useEffect(() => {
    if (user && (role === 'LANDLORD' || role === 'ADMIN')) {
      void loadMarketData();
      void loadProperties();
    }
  }, [user, role, loadMarketData, loadProperties]);

  useEffect(() => {
    if (selectedSuburb) void loadSuburbDetails(selectedSuburb);
  }, [selectedSuburb, loadSuburbDetails]);

  if (loading || !user) {
    return <LandlordWorkspaceLoading />;
  }

  return (
    <div className="space-y-6">
      <LandlordPageHeader
        badge="Intelligence"
        title="Market intelligence"
        subtitle="Same verified rental data as CRENIT B2B products — paid rent and payment behaviour by suburb."
        display
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

      {licensableAlerts.length ? (
        <div className="marketing-accent-panel">
          <p className="font-semibold text-[var(--rc-text)]">Your portfolio includes commercially licensable suburbs</p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--rc-text-secondary)]">
            {licensableAlerts.map((a: any) => (
              <li key={`${a.suburb}-${a.city}`} className="marketing-check-row !py-3">
                <span className="marketing-check-row__icon" aria-hidden>
                  ✓
                </span>
                <span>
                  <strong className="text-[var(--rc-text)]">{a.suburb}</strong> ({a.city}) — {a.transaction_count} verified
                  samples
                  {a.median_rent != null ? ` · median ${formatN$(a.median_rent)}` : ''}
                  {a.properties?.length ? ` · ${a.properties.map((p: { name: string }) => p.name).join(', ')}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <ErrorStateCard message={error} onRetry={loadMarketData} /> : null}

      {summary ? (
        <LandlordMarketDataHero summary={summary} dataSource={dataSource} dataSourceLabel={dataSourceLabel} />
      ) : isLoading ? (
        <SkeletonBlocks rows={2} />
      ) : null}

      <section className="chart-card">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-[#C0392B]" aria-hidden />
          <h2 className="text-lg font-semibold text-[var(--rc-text)]">Your rent vs suburb median</h2>
        </div>
        <p className="mt-2 text-sm text-[var(--rc-text-secondary)]">
          Compare a registered unit&apos;s monthly rent to verified suburb benchmarks.
        </p>
        <div className="mt-5 flex flex-wrap items-end gap-3">
          {unitOptions.length ? (
            <label className="text-sm font-medium text-[var(--rc-text)]">
              Your unit
              <select
                value={compareUnitId}
                onChange={(e) => {
                  const id = e.target.value;
                  setCompareUnitId(id);
                  const u = unitOptions.find((o) => o.id === id);
                  if (u) {
                    setCompareSuburb(u.suburb);
                    setCompareRent(String(u.rent ?? ''));
                    if (id) {
                      setCompareBusy(true);
                      api
                        .get('/market-data/compare', { params: { unit_id: id } })
                        .then((res) => setCompareResult(res.data.data))
                        .catch((err: any) =>
                          setError(err?.response?.data?.message || err?.message || 'Compare failed.'),
                        )
                        .finally(() => setCompareBusy(false));
                    }
                  } else {
                    setCompareResult(null);
                  }
                }}
                className={`mt-1 block min-w-[220px] ${landlordSelectClass}`}
              >
                <option value="">— or enter suburb below —</option>
                {unitOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="text-sm font-medium text-[var(--rc-text)]">
            Suburb
            <input
              type="text"
              value={compareSuburb}
              onChange={(e) => setCompareSuburb(e.target.value)}
              placeholder="e.g. Klein Windhoek"
              className={`mt-1 block ${landlordInputClass}`}
            />
          </label>
          <label className="text-sm font-medium text-[var(--rc-text)]">
            Monthly rent (NAD)
            <input
              type="number"
              value={compareRent}
              onChange={(e) => setCompareRent(e.target.value)}
              className={`mt-1 block w-32 ${landlordInputClass}`}
            />
          </label>
          <button
            type="button"
            disabled={compareBusy || (!compareUnitId && !compareSuburb)}
            onClick={() => void runCompare()}
            className="landlord-btn-primary disabled:opacity-50"
          >
            {compareBusy ? 'Comparing…' : 'Compare'}
          </button>
        </div>
        <RentCompareResult result={compareResult} />
      </section>

      <section className="chart-card">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-[#C0392B]" aria-hidden />
          <h2 className="text-lg font-semibold text-[var(--rc-text)]">Suburb explorer</h2>
        </div>
        {isLoading && !suburbs.length ? (
          <div className="mt-4">
            <SkeletonBlocks rows={4} />
          </div>
        ) : suburbs.length ? (
          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {suburbs.map((entry) => {
                const active = selectedSuburb === entry.suburb;
                return (
                  <button
                    key={`${entry.suburb}-${entry.city}`}
                    type="button"
                    onClick={() => setSelectedSuburb(entry.suburb)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      active
                        ? 'border-[#C0392B]/40 bg-[var(--rc-accent-surface)] shadow-sm'
                        : 'border-[var(--rc-border)] bg-[var(--rc-card-alt)] hover:border-[#C0392B]/25'
                    }`}
                  >
                    <p className="font-semibold text-[var(--rc-text)]">
                      {entry.suburb}
                      {entry.commercially_licensable ? (
                        <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                          Licensable
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-[var(--rc-text-muted)]">
                      {entry.city} · {formatN$(entry.median_rent ?? entry.avg_rent)} median
                      {entry.on_time_rate != null ? ` · ${Math.round(Number(entry.on_time_rate))}% on-time` : ''}
                      {entry.sample_count ? ` · n=${entry.sample_count}` : ''}
                    </p>
                  </button>
                );
              })}
            </div>

            {suburbDetails?.minimum_sample_not_met ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950">
                <p className="font-semibold">Not enough verified payments yet</p>
                <p className="mt-2">
                  {suburbDetails.suburb} has {suburbDetails.transaction_count ?? 0} sample
                  {(suburbDetails.required_minimum_sample ?? 5) > 1 ? 's' : ''} — need at least{' '}
                  {suburbDetails.required_minimum_sample ?? 5} for benchmarks.
                </p>
              </div>
            ) : suburbDetails ? (
              <div className="marketing-metal-card rounded-2xl p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C0392B]">Suburb detail</p>
                    <p className="mt-1 text-xl font-semibold text-[var(--rc-text)]">
                      {suburbDetails.suburb}, {suburbDetails.city}
                    </p>
                  </div>
                  <DataSourceBadge dataSource={suburbDetails.data_source} />
                </div>
                <p className="mt-2 text-sm capitalize text-[var(--rc-text-secondary)]">Trend: {suburbDetails.trend}</p>
                {suburbDetails.licensing_notice ? (
                  <p className="mt-2 text-xs text-[var(--rc-text-muted)]">{suburbDetails.licensing_notice}</p>
                ) : null}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="dashboard-hero__stat">
                    <p className="dashboard-hero__stat-label">Median rent</p>
                    <p className="dashboard-hero__stat-value">{formatN$(suburbDetails.latest_snapshot?.median_rent)}</p>
                  </div>
                  <div className="dashboard-hero__stat">
                    <p className="dashboard-hero__stat-label">On-time</p>
                    <p className="dashboard-hero__stat-value">
                      {suburbDetails.on_time_rate != null || suburbDetails.latest_snapshot?.on_time_rate != null
                        ? `${Math.round(Number(suburbDetails.on_time_rate ?? suburbDetails.latest_snapshot?.on_time_rate))}%`
                        : '—'}
                    </p>
                  </div>
                  <div className="dashboard-hero__stat">
                    <p className="dashboard-hero__stat-label">Range</p>
                    <p className="dashboard-hero__stat-value text-sm">
                      {formatN$(suburbDetails.latest_snapshot?.min_rent)} –{' '}
                      {formatN$(suburbDetails.latest_snapshot?.max_rent)}
                    </p>
                  </div>
                  <div className="dashboard-hero__stat">
                    <p className="dashboard-hero__stat-label">Confidence</p>
                    <p className="dashboard-hero__stat-value text-sm">{suburbDetails.confidence_level || '—'}</p>
                  </div>
                </div>

                {saleComps?.median_sale_price != null ? (
                  <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/80 p-4 text-sm text-sky-950">
                    <p className="font-semibold">Sale comps pilot</p>
                    <p className="mt-1">
                      {saleComps.transfer_count} transfer{saleComps.transfer_count === 1 ? '' : 's'} · median{' '}
                      {formatN$(saleComps.median_sale_price)}
                    </p>
                  </div>
                ) : null}

                <LazySuburbCharts
                  intelligence={suburbDetails.intelligence}
                  priceHistory={suburbDetails.price_history}
                  maxRent={suburbDetails.latest_snapshot?.max_rent}
                />

                {suburbDetails.intelligence?.income_to_rent_distribution?.length ? (
                  <div className="mt-5">
                    <p className="text-sm font-semibold text-[var(--rc-text)]">Income bands (consented tenants)</p>
                    <ul className="mt-2 space-y-1.5 text-sm text-[var(--rc-text-secondary)]">
                      {suburbDetails.intelligence.income_to_rent_distribution.map((row: any) => (
                        <li key={row.bracket} className="flex justify-between gap-4 rounded-lg bg-[var(--rc-card-alt)] px-3 py-2">
                          <span>{row.bracket}</span>
                          <span className="font-medium text-[var(--rc-text)]">{row.count} payments</span>
                        </li>
                      ))}
                    </ul>
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
