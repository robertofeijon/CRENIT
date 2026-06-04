'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Building2,
  Clock,
  Database,
  MapPin,
  RefreshCw,
  Route,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import AdminStatCard from '../../components/ui/AdminStatCard';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';
import B2bApiPlayground from './B2bApiPlayground';

type Timeframe = 'today' | '7d' | '30d' | '90d' | 'qtd' | 'ytd' | 'all';

type FilterOptions = {
  cities: string[];
  suburbs: string[];
  property_types: string[];
  bedrooms: number[];
  payment_statuses: string[];
};

type DashboardData = {
  pipeline_updated_at: string | null;
  data_source: 'market_data_records' | 'market_data_snapshots';
  filters_applied: Record<string, string | number | null>;
  kpis: {
    verified_records: number;
    active_suburbs: number;
    median_rent: number;
    on_time_rate: number;
    avg_days_to_pay: number;
    b2b_api_calls: number;
    reports_generated: number;
  };
  volume_trend: { month: string; records: number; avg_rent: number }[];
  rent_by_suburb: { suburb: string; median_rent: number; on_time_rate: number; records: number }[];
  property_mix: { label: string; count: number }[];
  payment_status_mix: { status: string; count: number; pct: number }[];
  commercial?: {
    licensable_suburbs: number;
    directional_suburbs: number;
    methodology: { headline: string; principles: string[]; data_domain: string };
    buyer_personas: { id: string; label: string; use: string }[];
  };
};

type SuburbRow = {
  suburb: string;
  transaction_count: number;
  avg_verified_rent_2br: number;
  median_rent: number;
  price_range?: { min: number; max: number; median: number };
  on_time_rate: number;
  avg_days_to_pay: number;
  trend: string;
  freshness_status?: string;
  confidence_level?: string;
  commercially_licensable?: boolean;
  licensing_notice?: string;
  recommended_use_cases?: string[];
};

type SuburbDetail = {
  suburb: string;
  transaction_count: number;
  price_range?: { min: number; max: number; median: number };
  pricing_guidance?: string;
  confidence_level?: string;
  licensing_notice?: string;
  rent_distribution: { range: string; count: number }[];
  on_time_trend: { month: string; on_time_rate: number }[];
  bedroom_breakdown: { label: string; avg_rent: number | null; sample_count: number }[];
  income_to_rent_distribution: { bracket: string; count: number }[];
};

type SaleCompsRoadmap = {
  status: string;
  title: string;
  summary: string;
  target_window: string;
  differentiation_from_rental: string;
  partner_integration: {
    headline: string;
    description: string;
    partner_types: { id: string; label: string; role: string }[];
    integration_steps: string[];
    technical_placeholder: Record<string, string>;
  };
  planned_products: {
    report_type: string;
    display_name: string;
    description: string;
    target_audiences: string[];
    suggested_price_nad: number;
  }[];
  admin_actions: string[];
};

type CommercialCatalog = {
  methodology: { headline: string; principles: string[]; data_domain: string; sample_thresholds: Record<string, number> };
  buyer_personas: { id: string; label: string; use: string }[];
  licensing_terms: string[];
  sale_comps_roadmap?: SaleCompsRoadmap;
  products?: any[];
};

const TIMEFRAME_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Past 7 days' },
  { value: '30d', label: 'Past 30 days' },
  { value: '90d', label: 'Past 90 days' },
  { value: 'qtd', label: 'Quarter to date' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'all', label: 'All time' },
];

const PIE_COLORS = ['#C0392B', '#1A1A1A', '#64748b', '#0ea5e9', '#f59e0b', '#10b981'];
const REPORT_TYPES_NEED_SUBURB = ['suburb_report', 'development_feasibility', 'lender_risk_pack'];

type TabId = 'explorer' | 'licensing' | 'products' | 'roadmap' | 'b2b';

type LicensableReport = {
  generated_at: string;
  data_source: string;
  summary: {
    total_suburbs_with_data: number;
    ready_to_license: number;
    directional_only: number;
    below_minimum: number;
  };
  ready_to_license: Array<{
    suburb: string;
    city: string;
    transaction_count: number;
    median_rent: number;
    on_time_rate: number;
    confidence_level: string;
    freshness_status?: string;
    licensing_notice?: string;
  }>;
  directional_only: Array<{ suburb: string; city: string; transaction_count: number; confidence_level: string }>;
};

export default function DataIntelligencePage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  const [timeframe, setTimeframe] = useState<Timeframe>('30d');
  const [city, setCity] = useState('');
  const [suburb, setSuburb] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [suburbs, setSuburbs] = useState<SuburbRow[]>([]);
  const [selectedSuburb, setSelectedSuburb] = useState<string | null>(null);
  const [suburbDetail, setSuburbDetail] = useState<SuburbDetail | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('explorer');

  const [commercial, setCommercial] = useState<CommercialCatalog | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [apiConfig, setApiConfig] = useState<any>(null);
  const [previewSuburb, setPreviewSuburb] = useState('');
  const [selectedReport, setSelectedReport] = useState('suburb_report');
  const [previewData, setPreviewData] = useState<unknown>(null);
  const [newKeyReveal, setNewKeyReveal] = useState<string | null>(null);
  const [licensableReport, setLicensableReport] = useState<LicensableReport | null>(null);

  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filterParams = useMemo(
    () => ({
      timeframe,
      city: city || undefined,
      suburb: suburb || undefined,
      property_type: propertyType || undefined,
      bedrooms: bedrooms || undefined,
      payment_status: paymentStatus || undefined,
    }),
    [timeframe, city, suburb, propertyType, bedrooms, paymentStatus],
  );

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  useEffect(() => {
    if (user && role === 'ADMIN') {
      api
        .get('/admin/data-intelligence/filter-options')
        .then((res) => setFilterOptions(res.data.data))
        .catch(() => null);
    }
  }, [user, role]);

  const loadAll = useCallback(async () => {
    setLoadingData(true);
    setError(null);
    try {
      const [dashRes, suburbsRes, catalogRes, clientsRes, apiRes, licensableRes] = await Promise.all([
        api.get('/admin/data-intelligence/dashboard', { params: filterParams }),
        api.get('/admin/data-intelligence/suburbs', { params: filterParams }),
        api.get('/admin/data-intelligence/commercial-catalog'),
        api.get('/admin/data-intelligence/b2b-clients'),
        api.get('/admin/data-intelligence/api-config'),
        api.get('/admin/data-intelligence/licensable-suburbs'),
      ]);
      setDashboard(dashRes.data.data);
      setSuburbs(suburbsRes.data.data?.suburbs ?? []);
      const catalog = catalogRes.data.data as CommercialCatalog;
      setCommercial(catalog);
      setProducts(catalog?.products ?? []);
      setClients(clientsRes.data.data ?? []);
      setApiConfig(apiRes.data.data);
      setLicensableReport(licensableRes.data.data);
      setLastFetchedAt(new Date());
      if (selectedSuburb) {
        const detailRes = await api.get(
          `/admin/data-intelligence/suburbs/${encodeURIComponent(selectedSuburb)}`,
          { params: filterParams },
        );
        setSuburbDetail(detailRes.data.data);
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiErr?.response?.data?.message || apiErr?.message || 'Failed to load data intelligence.');
    } finally {
      setLoadingData(false);
    }
  }, [filterParams, selectedSuburb]);

  useEffect(() => {
    if (user && role === 'ADMIN') {
      void loadAll();
    }
  }, [user, role, loadAll]);

  const openSuburb = async (name: string) => {
    setSelectedSuburb(name);
    setSuburbDetail(null);
    try {
      const res = await api.get(`/admin/data-intelligence/suburbs/${encodeURIComponent(name)}`, {
        params: filterParams,
      });
      setSuburbDetail(res.data.data);
      setActiveTab('explorer');
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiErr?.response?.data?.message || 'Unable to load suburb detail.');
    }
  };

  const clearFilters = () => {
    setTimeframe('30d');
    setCity('');
    setSuburb('');
    setPropertyType('');
    setBedrooms('');
    setPaymentStatus('');
  };

  const handlePreviewReport = async () => {
    setBusy(true);
    setPreviewData(null);
    try {
      const params = new URLSearchParams({ report_type: selectedReport });
      if (REPORT_TYPES_NEED_SUBURB.includes(selectedReport) && previewSuburb) {
        params.set('suburb', previewSuburb);
      }
      const res = await api.get(`/admin/data-intelligence/reports/preview?${params}`);
      setPreviewData(res.data.data);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiErr?.response?.data?.message || 'Preview failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleGeneratePdf = async () => {
    setBusy(true);
    try {
      const res = await api.post(
        '/admin/data-intelligence/reports/generate',
        {
          report_type: selectedReport,
          suburb: REPORT_TYPES_NEED_SUBURB.includes(selectedReport) ? previewSuburb : undefined,
        },
        { responseType: 'blob' },
      );
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `crenit-${selectedReport}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('PDF generation failed.');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user || role !== 'ADMIN') {
    return <p className="text-sm text-slate-500">Loading admin workspace...</p>;
  }

  const pipelineLabel = dashboard?.pipeline_updated_at
    ? new Date(dashboard.pipeline_updated_at).toLocaleString()
    : 'No captures yet';
  const refreshLabel = lastFetchedAt ? lastFetchedAt.toLocaleTimeString() : '—';
  const dataSourceLabel =
    dashboard?.data_source === 'market_data_snapshots'
      ? 'Aggregated snapshots (demo / pre-capture)'
      : 'Live verified payment pipeline';

  return (
    <div className="space-y-0">
      {/* Zone 1 — Header & global controls */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-slate-200 bg-[#F3F4F6]/95 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#C0392B]/90">B2B property data</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#1A1A1A]">Data Intelligence</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                Licensed rental market data for developers, estate agents, banks, contractors, and investors — verified
                payment comps by suburb, not listing scrapes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadAll()}
              disabled={loadingData}
              className="inline-flex items-center gap-2 rounded-full bg-[#C0392B] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#C0392B]/25 transition hover:bg-[#992d24] disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loadingData ? 'animate-spin' : ''}`} aria-hidden />
              Apply & refresh
            </button>
          </div>

          <div className="grid gap-3 rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-6">
            <FilterField label="Timeframe">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as Timeframe)}
                className={selectClass}
              >
                {TIMEFRAME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="City">
              <select value={city} onChange={(e) => setCity(e.target.value)} className={selectClass}>
                <option value="">All cities</option>
                {(filterOptions?.cities ?? ['Windhoek']).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Suburb">
              <select value={suburb} onChange={(e) => setSuburb(e.target.value)} className={selectClass}>
                <option value="">All suburbs</option>
                {(filterOptions?.suburbs ?? []).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Property type">
              <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className={selectClass}>
                <option value="">All types</option>
                {(filterOptions?.property_types ?? []).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Bedrooms">
              <select value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className={selectClass}>
                <option value="">Any</option>
                {(filterOptions?.bedrooms ?? [1, 2, 3]).map((b) => (
                  <option key={b} value={String(b)}>
                    {b} BR
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Payment behaviour">
              <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className={selectClass}>
                <option value="">All</option>
                <option value="on_time">On time</option>
                <option value="late">Late</option>
                <option value="missed">Missed</option>
              </select>
            </FilterField>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#C0392B]" aria-hidden />
                Pipeline last capture: <strong className="text-[#1A1A1A]">{pipelineLabel}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                Page refreshed: <strong className="text-[#1A1A1A]">{refreshLabel}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">{dataSourceLabel}</span>
              <button type="button" onClick={clearFilters} className="font-semibold text-[#C0392B] hover:underline">
                Reset filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8 pt-8">
        {commercial ? (
          <section className="rounded-[2rem] border border-[#C0392B]/20 bg-gradient-to-br from-[#FDEDEC] to-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C0392B]">What we sell</p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">{commercial.methodology.headline}</p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {commercial.methodology.principles.map((line) => (
                <li key={line} className="flex gap-2 text-xs leading-5 text-slate-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C0392B]" />
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-slate-600">
              <button
                type="button"
                onClick={() => setActiveTab('roadmap')}
                className="font-semibold text-[#C0392B] hover:underline"
              >
                Sale comps (planned)
              </button>
              {' '}
              — partner path for transfer prices; separate from rental data below.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {commercial.buyer_personas.map((persona) => (
                <div key={persona.id} className="rounded-xl border border-slate-200/80 bg-white/90 p-4">
                  <p className="text-sm font-semibold text-[#1A1A1A]">{persona.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{persona.use}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {error ? <ErrorStateCard message={error} onRetry={loadAll} /> : null}
        {newKeyReveal ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-semibold">New API key (copy now — shown once)</p>
            <code className="mt-2 block break-all rounded bg-white p-2 text-xs">{newKeyReveal}</code>
          </div>
        ) : null}

        {/* Zone 2 — KPIs & charts */}
        {loadingData && !dashboard ? (
          <SkeletonBlocks rows={6} />
        ) : (
          <>
            {dashboard ? (
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                <AdminStatCard
                  label="Verified records"
                  value={dashboard.kpis.verified_records.toLocaleString()}
                  sub="In selected period"
                  icon={Database}
                />
                <AdminStatCard
                  label="Active suburbs"
                  value={dashboard.kpis.active_suburbs}
                  sub="With data in view"
                  icon={MapPin}
                />
                <AdminStatCard
                  label="Median rent"
                  value={`N$${dashboard.kpis.median_rent.toLocaleString()}`}
                  sub="Weighted median"
                  icon={TrendingUp}
                />
                <AdminStatCard
                  label="On-time rate"
                  value={`${dashboard.kpis.on_time_rate}%`}
                  sub={`Avg ${dashboard.kpis.avg_days_to_pay} days to pay`}
                  icon={BarChart3}
                  accent={dashboard.kpis.on_time_rate >= 80 ? 'success' : 'warning'}
                />
                <AdminStatCard
                  label="B2B API calls"
                  value={dashboard.kpis.b2b_api_calls}
                  sub="In selected period"
                  icon={Activity}
                />
                <AdminStatCard
                  label="Reports generated"
                  value={dashboard.kpis.reports_generated}
                  sub="Admin & client pulls"
                  icon={Building2}
                  accent="dark"
                />
              </section>
            ) : null}

            <section className="grid gap-6 lg:grid-cols-2">
              <ChartCard title="Capture volume & avg rent" subtitle="Monthly verified records in view">
                <div className="h-64">
                  {dashboard?.volume_trend?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dashboard.volume_trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="records"
                          stroke="#1A1A1A"
                          strokeWidth={2}
                          dot={false}
                          name="Records"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="avg_rent"
                          stroke="#C0392B"
                          strokeWidth={2}
                          dot={false}
                          name="Avg rent (N$)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <ChartEmpty />
                  )}
                </div>
              </ChartCard>

              <ChartCard title="Top suburbs by volume" subtitle="Licensed rent comps — median & on-time rate">
                <div className="h-64">
                  {dashboard?.rent_by_suburb?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboard.rent_by_suburb} layout="vertical" margin={{ left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="suburb" width={100} tick={{ fontSize: 10 }} />
                        <Tooltip
                          formatter={(value, name) => [
                            name === 'median_rent' ? `N$${Number(value).toLocaleString()}` : value,
                            name === 'median_rent' ? 'Median rent' : 'On-time %',
                          ]}
                        />
                        <Bar dataKey="median_rent" fill="#1A1A1A" radius={[0, 4, 4, 0]} name="median_rent" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <ChartEmpty />
                  )}
                </div>
              </ChartCard>

              <ChartCard title="Property mix" subtitle="Share of records by type">
                <div className="h-64">
                  {dashboard?.property_mix?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dashboard.property_mix}
                          dataKey="count"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                        >
                          {dashboard.property_mix.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <ChartEmpty />
                  )}
                </div>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {dashboard?.property_mix?.map((item, i) => (
                    <li key={item.label} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      {item.label} ({item.count})
                    </li>
                  ))}
                </ul>
              </ChartCard>

              <ChartCard title="Payment behaviour" subtitle="On-time vs late vs missed">
                <div className="mt-4 space-y-3">
                  {dashboard?.payment_status_mix?.length ? (
                    dashboard.payment_status_mix.map((row) => (
                      <div key={row.status}>
                        <div className="mb-1 flex justify-between text-xs font-medium text-slate-600">
                          <span className="capitalize">{row.status.replace('_', ' ')}</span>
                          <span>
                            {row.pct}% · {row.count} records
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[#C0392B] transition-all"
                            style={{
                              width: `${row.pct}%`,
                              opacity: row.status === 'on_time' ? 1 : row.status === 'late' ? 0.65 : 0.4,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <ChartEmpty />
                  )}
                </div>
              </ChartCard>
            </section>
          </>
        )}

        {/* Zone 3 — Tabbed workspace */}
        <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap gap-1 border-b border-slate-100 p-2">
            {(
              [
                { id: 'explorer' as TabId, label: 'Suburb comps' },
                { id: 'licensing' as TabId, label: 'Ready to license' },
                { id: 'products' as TabId, label: 'Licensed products' },
                { id: 'roadmap' as TabId, label: 'Sale comps (planned)' },
                { id: 'b2b' as TabId, label: 'Clients & API' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id ? 'bg-[#1A1A1A] text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 sm:p-8">
            {activeTab === 'explorer' ? (
              <ExplorerPanel
                suburbs={suburbs}
                selectedSuburb={selectedSuburb}
                suburbDetail={suburbDetail}
                loading={loadingData}
                onSelectSuburb={openSuburb}
              />
            ) : null}

            {activeTab === 'licensing' ? (
              <LicensingPanel
                report={licensableReport}
                busy={busy}
                onRollup={async () => {
                  setBusy(true);
                  try {
                    await api.post('/admin/data-intelligence/snapshots/rollup');
                    void loadAll();
                  } catch (err: unknown) {
                    const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
                    setError(apiErr?.response?.data?.message || 'Rollup failed.');
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            ) : null}

            {activeTab === 'products' ? (
              <ProductsPanel
                licensingTerms={commercial?.licensing_terms}
                products={products}
                selectedReport={selectedReport}
                setSelectedReport={setSelectedReport}
                previewSuburb={previewSuburb}
                setPreviewSuburb={setPreviewSuburb}
                previewData={previewData}
                busy={busy}
                suburbOptions={filterOptions?.suburbs ?? suburbs.map((s) => s.suburb)}
                onPreview={handlePreviewReport}
                onPdf={handleGeneratePdf}
                onGoToB2bSample={() => setActiveTab('b2b')}
                onMethodologyPdf={async () => {
                  setBusy(true);
                  try {
                    const res = await api.get('/admin/data-intelligence/methodology/pdf', { responseType: 'blob' });
                    const url = URL.createObjectURL(res.data);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'crenit-data-intelligence-methodology.pdf';
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (err: unknown) {
                    const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
                    setError(apiErr?.response?.data?.message || 'Methodology PDF failed.');
                  } finally {
                    setBusy(false);
                  }
                }}
                onPriceUpdate={async (reportType, price) => {
                  await api.put(`/admin/data-intelligence/report-products/${reportType}/price`, { price_nad: price });
                  void loadAll();
                }}
              />
            ) : null}

            {activeTab === 'roadmap' ? (
              <SaleCompsRoadmapPanel roadmap={commercial?.sale_comps_roadmap} onGoToB2b={() => setActiveTab('b2b')} />
            ) : null}

            {activeTab === 'b2b' ? (
              <B2bPanel
                licensingTerms={commercial?.licensing_terms}
                clients={clients}
                apiConfig={apiConfig}
                apiKeySample={newKeyReveal}
                suburbOptions={filterOptions?.suburbs ?? suburbs.map((s) => s.suburb)}
                onError={setError}
                onGenerateKey={async (clientId) => {
                  setNewKeyReveal(null);
                  try {
                    const res = await api.post(`/admin/data-intelligence/b2b-clients/${clientId}/api-keys`, {
                      label: 'Admin generated',
                    });
                    setNewKeyReveal(res.data.data?.key ?? null);
                    void loadAll();
                  } catch {
                    setError('Failed to generate API key.');
                  }
                }}
                onRevokeKey={async (keyId) => {
                  await api.post(`/admin/data-intelligence/api-keys/${keyId}/revoke`);
                  void loadAll();
                }}
              />
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

const selectClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#1A1A1A] outline-none transition focus:border-[#C0392B]/60';

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-[#1A1A1A]">{title}</h3>
      <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function ChartEmpty() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-400">No data for current filters</div>
  );
}

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

function ExplorerPanel({
  suburbs,
  selectedSuburb,
  suburbDetail,
  loading,
  onSelectSuburb,
}: {
  suburbs: SuburbRow[];
  selectedSuburb: string | null;
  suburbDetail: SuburbDetail | null;
  loading: boolean;
  onSelectSuburb: (name: string) => void;
}) {
  if (loading && !suburbs.length) return <SkeletonBlocks rows={4} />;

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Verified <strong>rental</strong> price ranges for client reports, feasibility, and asking-rent decisions. Not sale
        deed data.
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="bg-[#F3F4F6] text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-semibold">Suburb</th>
              <th className="px-4 py-3 font-semibold">Rent range (verified)</th>
              <th className="px-4 py-3 font-semibold">Median</th>
              <th className="px-4 py-3 font-semibold">Sample</th>
              <th className="px-4 py-3 font-semibold">Confidence</th>
              <th className="px-4 py-3 font-semibold">On-time</th>
              <th className="px-4 py-3 font-semibold">Trend</th>
              <th className="px-4 py-3 font-semibold">License</th>
            </tr>
          </thead>
          <tbody>
            {suburbs.map((row) => (
              <tr
                key={row.suburb}
                onClick={() => onSelectSuburb(row.suburb)}
                className={`cursor-pointer border-t border-slate-100 transition hover:bg-slate-50 ${
                  selectedSuburb === row.suburb ? 'bg-[#FDEDEC]' : ''
                }`}
              >
                <td className="px-4 py-3 font-medium text-[#1A1A1A]">{row.suburb}</td>
                <td className="px-4 py-3 text-slate-700">
                  {row.price_range
                    ? `N$${row.price_range.min.toLocaleString()} – N$${row.price_range.max.toLocaleString()}`
                    : `N$${row.median_rent.toLocaleString()}`}
                </td>
                <td className="px-4 py-3">N${row.median_rent.toLocaleString()}</td>
                <td className="px-4 py-3">{row.transaction_count}</td>
                <td className="px-4 py-3">
                  <ConfidenceBadge level={row.confidence_level} />
                </td>
                <td className="px-4 py-3">{row.on_time_rate}%</td>
                <td className="px-4 py-3">
                  <TrendBadge trend={row.trend} />
                </td>
                <td className="px-4 py-3">
                  {row.commercially_licensable ? (
                    <span className="text-xs font-semibold text-emerald-700">Ready to sell</span>
                  ) : (
                    <span className="text-xs text-amber-800">Directional</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!suburbs.length ? (
          <div className="p-6">
            <EmptyStateCard
              title="No suburbs in view"
              description="Adjust filters or run supabase/seed.sql to load market_data_snapshots."
            />
          </div>
        ) : null}
      </div>

      {suburbDetail && suburbDetail.rent_distribution ? (
        <div className="space-y-6 border-t border-slate-100 pt-8">
          {suburbDetail.price_range ? (
            <div className="rounded-xl border border-slate-200 bg-[#F3F4F6] p-5">
              <p className="text-lg font-semibold text-[#1A1A1A]">
                {suburbDetail.suburb} — verified rental band N${suburbDetail.price_range.min.toLocaleString()} – N$
                {suburbDetail.price_range.max.toLocaleString()}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Median N${suburbDetail.price_range.median.toLocaleString()} · {suburbDetail.transaction_count} records ·{' '}
                <ConfidenceBadge level={suburbDetail.confidence_level} />
              </p>
              {suburbDetail.pricing_guidance ? (
                <p className="mt-3 text-xs leading-5 text-slate-500">{suburbDetail.pricing_guidance}</p>
              ) : null}
              {suburbDetail.licensing_notice ? (
                <p className="mt-2 text-xs font-medium text-[#C0392B]">{suburbDetail.licensing_notice}</p>
              ) : null}
            </div>
          ) : null}
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="font-semibold text-[#1A1A1A]">Rent distribution (what clients buy)</h3>
            <div className="mt-4 h-56">
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
          </div>
          <div>
            <h3 className="font-semibold text-[#1A1A1A]">On-time rate trend</h3>
            <div className="mt-4 h-56">
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
          </div>
        </div>
        </div>
      ) : null}
    </div>
  );
}

function SaleCompsRoadmapPanel({
  roadmap,
  onGoToB2b,
}: {
  roadmap?: SaleCompsRoadmap;
  onGoToB2b: () => void;
}) {
  if (!roadmap) {
    return <EmptyStateCard title="Roadmap loading" description="Refresh the page to load sale comps roadmap." />;
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
            <Route className="h-3.5 w-3.5" aria-hidden />
            {roadmap.status}
          </span>
          <h3 className="text-xl font-semibold text-[#1A1A1A]">{roadmap.title}</h3>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{roadmap.summary}</p>
        <p className="mt-2 text-xs font-medium text-[#C0392B]">{roadmap.target_window}</p>
        <p className="mt-4 rounded-lg bg-white p-4 text-xs leading-5 text-slate-600">{roadmap.differentiation_from_rental}</p>
      </div>

      <div>
        <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{roadmap.partner_integration.headline}</h4>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">{roadmap.partner_integration.description}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {roadmap.partner_integration.partner_types.map((partner) => (
            <div key={partner.id} className="rounded-xl border border-slate-200 bg-[#F3F4F6] p-4">
              <p className="font-semibold text-[#1A1A1A]">{partner.label}</p>
              <p className="mt-2 text-xs leading-5 text-slate-600">{partner.role}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Integration steps</h4>
        <ol className="mt-4 space-y-3">
          {roadmap.partner_integration.integration_steps.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm text-slate-700">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1A1A1A] text-xs font-semibold text-white">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-xl border border-slate-200 bg-[#1A1A1A] p-5 text-slate-300">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Technical placeholder (not live)</p>
        <ul className="mt-3 space-y-2 font-mono text-xs">
          {Object.entries(roadmap.partner_integration.technical_placeholder).map(([key, value]) => (
            <li key={key}>
              <span className="text-slate-500">{key}: </span>
              {value}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Planned products</h4>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {roadmap.planned_products.map((product) => (
            <div key={product.report_type} className="rounded-xl border border-dashed border-slate-300 bg-white p-5 opacity-90">
              <p className="text-xs font-semibold uppercase text-slate-400">Coming with partner data</p>
              <h5 className="mt-2 font-semibold text-[#1A1A1A]">{product.display_name}</h5>
              <p className="mt-2 text-sm text-slate-600">{product.description}</p>
              <p className="mt-3 text-xs text-slate-500">{product.target_audiences.join(' · ')}</p>
              <p className="mt-2 text-sm font-semibold text-slate-700">
                Indicative N${product.suggested_price_nad.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-semibold text-amber-950">Admin checklist</p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-xs leading-5 text-amber-900">
          {roadmap.admin_actions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onGoToB2b}
          className="mt-4 rounded-full bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-white"
        >
          Register partner in B2B clients →
        </button>
      </div>
    </div>
  );
}

function LicensingPanel({
  report,
  busy,
  onRollup,
}: {
  report: LicensableReport | null;
  busy: boolean;
  onRollup: () => void;
}) {
  if (!report) {
    return <p className="text-sm text-slate-500">Loading licensable suburb report…</p>;
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Suburbs with ≥10 verified payment records are cleared for commercial licensing (same rule as B2B API).
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={onRollup}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Run snapshot rollup now
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <AdminStatCard label="Ready to license" value={report.summary.ready_to_license} icon={MapPin} />
        <AdminStatCard label="Directional (5–9)" value={report.summary.directional_only} icon={BarChart3} />
        <AdminStatCard label="Below minimum" value={report.summary.below_minimum} icon={Database} />
        <AdminStatCard label="Data source" value={report.data_source === 'market_data_records' ? 'Verified' : 'Fallback'} icon={Activity} />
      </div>
      {report.ready_to_license.length ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Suburb</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">n</th>
                <th className="px-4 py-3">Median rent</th>
                <th className="px-4 py-3">On-time %</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Freshness</th>
              </tr>
            </thead>
            <tbody>
              {report.ready_to_license.map((row) => (
                <tr key={row.suburb} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{row.suburb}</td>
                  <td className="px-4 py-3">{row.city}</td>
                  <td className="px-4 py-3">{row.transaction_count}</td>
                  <td className="px-4 py-3">N${row.median_rent?.toLocaleString()}</td>
                  <td className="px-4 py-3">{row.on_time_rate}%</td>
                  <td className="px-4 py-3 capitalize">{row.confidence_level}</td>
                  <td className="px-4 py-3 capitalize">{row.freshness_status ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyStateCard
          title="No licensable suburbs yet"
          description="Need at least 10 verified records per suburb. Grow consented payments on-platform."
        />
      )}
    </div>
  );
}

function ProductsPanel({
  licensingTerms = [],
  products,
  selectedReport,
  setSelectedReport,
  previewSuburb,
  setPreviewSuburb,
  previewData,
  busy,
  suburbOptions,
  onPreview,
  onPdf,
  onMethodologyPdf,
  onPriceUpdate,
  onGoToB2bSample,
}: {
  licensingTerms?: string[];
  products: any[];
  selectedReport: string;
  setSelectedReport: (v: string) => void;
  previewSuburb: string;
  setPreviewSuburb: (v: string) => void;
  previewData: unknown;
  busy: boolean;
  suburbOptions: string[];
  onPreview: () => void;
  onPdf: () => void;
  onMethodologyPdf: () => void;
  onPriceUpdate: (reportType: string, price: number) => void;
  onGoToB2bSample?: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Priced data products for property professionals. Adjust NAD pricing before quoting enterprise clients.
          {onGoToB2bSample ? (
            <>
              {' '}
              Integrators use the{' '}
              <button type="button" onClick={onGoToB2bSample} className="font-semibold text-[#C0392B] hover:underline">
                B2B report API sample
              </button>
              .
            </>
          ) : null}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={onMethodologyPdf}
          className="rounded-full bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#992d24] disabled:opacity-60"
        >
          Download methodology PDF
        </button>
      </div>
      {licensingTerms?.length ? (
        <ul className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
          {licensingTerms.map((term) => (
            <li key={term} className="mt-1 list-inside list-disc first:mt-0">
              {term}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {products.map((p) => (
          <div key={p.report_type} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-semibold text-[#1A1A1A]">{p.display_name}</h3>
              {p.requires_suburb ? (
                <span className="rounded-full bg-[#FDEDEC] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#C0392B]">
                  Per suburb
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                  City-wide
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-600">{p.description}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Who buys</p>
            <p className="mt-1 text-xs text-slate-600">{(p.target_audiences ?? []).join(' · ')}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Use cases</p>
            <ul className="mt-1 list-inside list-disc text-xs text-slate-600">
              {(p.use_cases ?? []).slice(0, 3).map((u: string) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
            <label className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-4 text-sm text-slate-700">
              <span>License price (NAD)</span>
              <input
                type="number"
                defaultValue={p.price_nad}
                className="w-28 rounded-lg border border-slate-200 bg-[#F3F4F6] px-2 py-1.5 text-right font-semibold"
                onBlur={(e) => onPriceUpdate(p.report_type, Number(e.target.value))}
              />
            </label>
            <p className="mt-1 text-[10px] text-slate-400">Suggested N${Number(p.suggested_price_nad ?? p.price_nad).toLocaleString()}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-[#F3F4F6] p-4">
        <label className="text-sm">
          Report
          <select
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            {products.map((p) => (
              <option key={p.report_type} value={p.report_type}>
                {p.display_name}
              </option>
            ))}
          </select>
        </label>
        {REPORT_TYPES_NEED_SUBURB.includes(selectedReport) ? (
          <label className="text-sm">
            Suburb
            <select
              value={previewSuburb}
              onChange={(e) => setPreviewSuburb(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <option value="">Select suburb</option>
              {suburbOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={onPreview}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
        >
          Preview JSON
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onPdf}
          className="rounded-full bg-[#1A1A1A] px-4 py-2 text-sm font-semibold text-white"
        >
          Download PDF
        </button>
      </div>
      {previewData ? (
        <pre className="max-h-48 overflow-auto rounded-xl bg-[#1A1A1A] p-4 text-xs text-slate-100">
          {JSON.stringify(previewData, null, 2)}
        </pre>
      ) : (
        <EmptyStateCard title="No preview" description="Select a report and run preview." />
      )}
    </div>
  );
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function B2bPanel({
  licensingTerms,
  clients,
  apiConfig,
  apiKeySample,
  suburbOptions,
  onError,
  onGenerateKey,
  onRevokeKey,
}: {
  licensingTerms?: string[];
  clients: any[];
  apiConfig: any;
  apiKeySample: string | null;
  suburbOptions: string[];
  onError: (message: string) => void;
  onGenerateKey: (id: string) => void;
  onRevokeKey: (id: string) => void;
}) {
  const [sampleReport, setSampleReport] = useState('suburb_report');
  const [sampleSuburb, setSampleSuburb] = useState('');
  const [sampleBusy, setSampleBusy] = useState(false);
  const [samplePreview, setSamplePreview] = useState<unknown>(null);
  const [copied, setCopied] = useState(false);

  const sampleSuburbParam =
    REPORT_TYPES_NEED_SUBURB.includes(sampleReport) && sampleSuburb
      ? `?suburb=${encodeURIComponent(sampleSuburb)}`
      : '';

  const sampleCurl = apiKeySample
    ? `curl -sS -H "X-CRENIT-Key: ${apiKeySample}" "${API_BASE}/api/v1/reports/${sampleReport}/pdf${sampleSuburbParam}" -o crenit-${sampleReport}.pdf`
    : `curl -sS -H "X-CRENIT-Key: YOUR_KEY" "${API_BASE}/api/v1/reports/${sampleReport}/pdf${sampleSuburbParam}" -o crenit-${sampleReport}.pdf`;

  const copyCurl = async () => {
    try {
      await navigator.clipboard.writeText(sampleCurl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onError('Could not copy to clipboard.');
    }
  };

  const runB2bPreviewSample = async () => {
    if (!apiKeySample) {
      onError('Generate an API key below, then run the B2B sample.');
      return;
    }
    if (REPORT_TYPES_NEED_SUBURB.includes(sampleReport) && !sampleSuburb) {
      onError('Select a suburb for this report type.');
      return;
    }
    setSampleBusy(true);
    setSamplePreview(null);
    try {
      const url = `${API_BASE}/api/v1/reports/${sampleReport}/preview${sampleSuburbParam}`;
      const res = await fetch(url, { headers: { 'X-CRENIT-Key': apiKeySample } });
      const json = await res.json();
      if (!res.ok) throw new Error((json as { message?: string }).message || `Preview failed (${res.status})`);
      setSamplePreview(json);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'B2B preview failed.');
    } finally {
      setSampleBusy(false);
    }
  };

  const runB2bPdfSample = async () => {
    if (!apiKeySample) {
      onError('Generate an API key below, then run the B2B sample.');
      return;
    }
    if (REPORT_TYPES_NEED_SUBURB.includes(sampleReport) && !sampleSuburb) {
      onError('Select a suburb for this report type.');
      return;
    }
    setSampleBusy(true);
    try {
      const url = `${API_BASE}/api/v1/reports/${sampleReport}/pdf${sampleSuburbParam}`;
      const res = await fetch(url, { headers: { 'X-CRENIT-Key': apiKeySample } });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error((errBody as { message?: string }).message || `B2B PDF failed (${res.status})`);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `crenit-b2b-${sampleReport}${sampleSuburb ? `-${sampleSuburb}` : ''}.pdf`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'B2B PDF sample failed.';
      onError(message);
    } finally {
      setSampleBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-[#C0392B]/20 bg-[#FDEDEC]/40 p-5">
        <h3 className="font-semibold text-[#1A1A1A]">B2B report API sample</h3>
        <p className="mt-1 text-sm text-slate-600">
          Same PDFs as <strong>Licensed products</strong>, but pulled by integrators with <code className="text-xs">X-CRENIT-Key</code>.
          Admin PDF uses session auth; B2B uses the routes below.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Report
            <select
              value={sampleReport}
              onChange={(e) => setSampleReport(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <option value="suburb_report">Suburb report</option>
              <option value="city_overview">City overview</option>
              <option value="lender_risk_pack">Lender risk pack</option>
              <option value="development_feasibility">Development feasibility</option>
            </select>
          </label>
          {REPORT_TYPES_NEED_SUBURB.includes(sampleReport) ? (
            <label className="text-sm">
              Suburb
              <select
                value={sampleSuburb}
                onChange={(e) => setSampleSuburb(e.target.value)}
                className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <option value="">Select suburb</option>
                {suburbOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            type="button"
            disabled={sampleBusy}
            onClick={() => void runB2bPreviewSample()}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Preview JSON
          </button>
          <button
            type="button"
            disabled={sampleBusy}
            onClick={() => void runB2bPdfSample()}
            className="rounded-full bg-[#1A1A1A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {sampleBusy ? 'Working…' : 'Download PDF'}
          </button>
          <button
            type="button"
            onClick={() => void copyCurl()}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
          >
            {copied ? 'Copied' : 'Copy curl'}
          </button>
        </div>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-[#1A1A1A] p-3 text-[11px] leading-relaxed text-slate-100">
          {sampleCurl}
        </pre>
        {!apiKeySample ? (
          <p className="mt-2 text-xs text-amber-800">Generate a client API key in the list below to enable live download.</p>
        ) : null}
        {samplePreview ? (
          <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-[#1A1A1A] p-4 text-xs text-slate-100">
            {JSON.stringify(samplePreview, null, 2)}
          </pre>
        ) : null}
      </div>

      <B2bApiPlayground apiKey={apiKeySample} suburbOptions={suburbOptions} onError={onError} />

    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <h3 className="font-semibold text-[#1A1A1A]">Licensed B2B clients</h3>
        <p className="mt-1 text-sm text-slate-600">Banks, developers, estate agencies, and research firms with API or report access.</p>
        <div className="mt-4 space-y-3">
          {clients.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 p-4">
              <p className="font-semibold">{c.name}</p>
              <p className="mt-1 text-sm text-slate-600">
                {c.client_type} · {c.access_tier} · {c.reports_pulled_this_month} reports/mo
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(c.api_keys ?? []).map((k: any) => (
                  <span key={k.id} className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                    {k.key_prefix}… {k.is_active ? 'active' : 'revoked'}
                    {k.is_active ? (
                      <button type="button" onClick={() => onRevokeKey(k.id)} className="ml-1 text-[#C0392B]">
                        revoke
                      </button>
                    ) : null}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => onGenerateKey(c.id)}
                  className="text-xs font-semibold text-[#C0392B] hover:underline"
                >
                  + API key
                </button>
              </div>
            </div>
          ))}
          {!clients.length ? <EmptyStateCard title="No B2B clients" description="Seed migration 0006 clients." /> : null}
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-[#1A1A1A]">API for integrators</h3>
        <p className="mt-1 text-sm text-slate-500">Embed suburb comps in CRM, feasibility tools, or credit systems. Header: X-CRENIT-Key</p>
        {licensingTerms?.length ? (
          <ul className="mt-3 space-y-1 text-xs text-slate-500">
            {licensingTerms.slice(0, 2).map((t) => (
              <li key={t}>• {t}</li>
            ))}
          </ul>
        ) : null}
        {apiConfig ? (
          <>
            <ul className="mt-4 space-y-2 text-sm">
              {apiConfig.endpoints?.map((ep: { path: string; description: string }) => (
                <li key={ep.path} className="rounded-lg bg-[#F3F4F6] px-3 py-2 font-mono text-xs">
                  {ep.path} — {ep.description}
                </li>
              ))}
            </ul>
            <h4 className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Recent usage</h4>
            <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs text-slate-600">
              {(apiConfig.usage_logs ?? []).map((log: any, i: number) => (
                <li key={i} className="border-b border-slate-100 py-1">
                  {log.b2b_clients?.name ?? 'Client'} · {log.endpoint} · {new Date(log.created_at).toLocaleString()}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </div>
    </div>
  );
}
