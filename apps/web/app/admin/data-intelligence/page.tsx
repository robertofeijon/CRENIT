"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';

type PlatformHealth = {
  total_verified_records: number;
  statistically_usable_suburbs: number;
  latest_capture_at: string | null;
  anonymised_tenancy_records: number;
};

type SuburbRow = {
  suburb: string;
  transaction_count: number;
  avg_verified_rent_2br: number;
  median_rent: number;
  on_time_rate: number;
  avg_days_to_pay: number;
  trend: string;
};

type SuburbDetail = {
  suburb: string;
  transaction_count: number;
  rent_distribution: { range: string; count: number }[];
  on_time_trend: { month: string; on_time_rate: number }[];
  bedroom_breakdown: { label: string; avg_rent: number | null; sample_count: number }[];
  income_to_rent_distribution: { bracket: string; count: number }[];
};

type ReportProduct = {
  report_type: string;
  display_name: string;
  description: string;
  price_nad: number;
};

type B2bClient = {
  id: string;
  name: string;
  client_type: string;
  access_tier: string;
  subscription_status: string;
  reports_pulled_this_month: number;
  api_keys?: { id: string; key_prefix: string; is_active: boolean }[];
};

const REPORT_TYPES_NEED_SUBURB = ['suburb_report', 'development_feasibility', 'lender_risk_pack'];

export default function DataIntelligencePage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [suburbs, setSuburbs] = useState<SuburbRow[]>([]);
  const [selectedSuburb, setSelectedSuburb] = useState<string | null>(null);
  const [suburbDetail, setSuburbDetail] = useState<SuburbDetail | null>(null);
  const [products, setProducts] = useState<ReportProduct[]>([]);
  const [clients, setClients] = useState<B2bClient[]>([]);
  const [apiConfig, setApiConfig] = useState<{
    endpoints: { path: string; description: string }[];
    tier_limits: Record<string, number>;
    usage_logs: { endpoint: string; created_at: string; b2b_clients?: { name: string } }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewSuburb, setPreviewSuburb] = useState('');
  const [selectedReport, setSelectedReport] = useState<string>('suburb_report');
  const [previewData, setPreviewData] = useState<unknown>(null);
  const [newKeyReveal, setNewKeyReveal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [healthRes, suburbsRes, productsRes, clientsRes, apiRes] = await Promise.all([
        api.get('/admin/data-intelligence/platform-health'),
        api.get('/admin/data-intelligence/suburbs'),
        api.get('/admin/data-intelligence/report-products'),
        api.get('/admin/data-intelligence/b2b-clients'),
        api.get('/admin/data-intelligence/api-config'),
      ]);
      setHealth(healthRes.data.data);
      setSuburbs(suburbsRes.data.data?.suburbs ?? []);
      setProducts(productsRes.data.data ?? []);
      setClients(clientsRes.data.data ?? []);
      setApiConfig(apiRes.data.data);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiErr?.response?.data?.message || apiErr?.message || 'Failed to load data intelligence.');
    }
  }, []);

  useEffect(() => {
    if (user && role === 'ADMIN') loadAll();
  }, [user, role, loadAll]);

  const openSuburb = async (suburb: string) => {
    setSelectedSuburb(suburb);
    setSuburbDetail(null);
    try {
      const res = await api.get(`/admin/data-intelligence/suburbs/${encodeURIComponent(suburb)}`);
      setSuburbDetail(res.data.data);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiErr?.response?.data?.message || 'Unable to load suburb detail.');
    }
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
      a.download = `rentcredit-${selectedReport}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('PDF generation failed.');
    } finally {
      setBusy(false);
    }
  };

  const handlePriceUpdate = async (reportType: string, price: number) => {
    await api.put(`/admin/data-intelligence/report-products/${reportType}/price`, { price_nad: price });
    loadAll();
  };

  const handleGenerateKey = async (clientId: string) => {
    setNewKeyReveal(null);
    try {
      const res = await api.post(`/admin/data-intelligence/b2b-clients/${clientId}/api-keys`, { label: 'Admin generated' });
      setNewKeyReveal(res.data.data?.key ?? null);
      loadAll();
    } catch {
      setError('Failed to generate API key.');
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    await api.post(`/admin/data-intelligence/api-keys/${keyId}/revoke`);
    loadAll();
  };

  if (loading || !user || role !== 'ADMIN') {
    return <div className="rounded-3xl border border-slate-200 bg-white p-8">Loading…</div>;
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">RentCredit internal</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Data Intelligence</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Verified Namibian rental market data — aggregated from confirmed payments. B2B clients and API access are managed here only.
        </p>
        {health && health.total_verified_records === 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">No market data yet</p>
            <p className="mt-1 text-slate-600">
              Market data has not been seeded or there are no verified payment records available. Seed the market intelligence dataset and try again.
            </p>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {newKeyReveal ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">New API key (copy now — shown once)</p>
          <code className="mt-2 block break-all rounded bg-white p-2 text-xs">{newKeyReveal}</code>
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Platform data health</h2>
        {health ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Verified payment records" value={health.total_verified_records} />
            <StatCard label="Suburbs (10+ data points)" value={health.statistically_usable_suburbs} />
            <StatCard
              label="Latest capture"
              value={health.latest_capture_at ? new Date(health.latest_capture_at).toLocaleString() : '—'}
              small
            />
            <StatCard label="Anonymised tenancy records" value={health.anonymised_tenancy_records} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Loading…</p>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Suburb explorer</h2>
        <p className="mt-1 text-sm text-slate-500">Minimum 5 verified records per suburb. Click a row for detail.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider text-slate-500">
                <th className="py-3 pr-4">Suburb</th>
                <th className="py-3 pr-4">Transactions</th>
                <th className="py-3 pr-4">Avg rent (2BR)</th>
                <th className="py-3 pr-4">Median</th>
                <th className="py-3 pr-4">On-time %</th>
                <th className="py-3 pr-4">Avg days to pay</th>
                <th className="py-3">Trend</th>
              </tr>
            </thead>
            <tbody>
              {suburbs.map((row) => (
                <tr
                  key={row.suburb}
                  onClick={() => openSuburb(row.suburb)}
                  className={`cursor-pointer border-b border-slate-100 hover:bg-slate-50 ${
                    selectedSuburb === row.suburb ? 'bg-slate-50' : ''
                  }`}
                >
                  <td className="py-3 font-medium text-slate-900">{row.suburb}</td>
                  <td className="py-3">{row.transaction_count}</td>
                  <td className="py-3">N${row.avg_verified_rent_2br.toLocaleString()}</td>
                  <td className="py-3">N${row.median_rent.toLocaleString()}</td>
                  <td className="py-3">{row.on_time_rate}%</td>
                  <td className="py-3">{row.avg_days_to_pay}</td>
                  <td className="py-3">
                    <TrendBadge trend={row.trend} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!suburbs.length ? <p className="mt-4 text-sm text-slate-500">No suburbs meet the minimum sample threshold yet.</p> : null}
        </div>

        {suburbDetail ? (
          <div className="mt-8 grid gap-6 border-t border-slate-200 pt-8 lg:grid-cols-2">
            <div>
              <h3 className="font-semibold text-slate-900">{suburbDetail.suburb} — rent distribution</h3>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={suburbDetail.rent_distribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0f172a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">On-time rate (12 months)</h3>
              <div className="mt-4 h-64">
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
            <div>
              <h3 className="font-semibold text-slate-900">Bedroom breakdown</h3>
              <ul className="mt-4 space-y-2 text-sm">
                {suburbDetail.bedroom_breakdown.map((b) => (
                  <li key={b.label} className="flex justify-between rounded-2xl bg-slate-50 px-4 py-2">
                    <span>{b.label}</span>
                    <span className="font-medium">
                      {b.avg_rent != null ? `N$${b.avg_rent.toLocaleString()} (${b.sample_count} records)` : 'Insufficient data'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Income band distribution</h3>
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={suburbDetail.income_to_rent_distribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="bracket" width={90} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#64748b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Data product management</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {products.map((p) => (
            <div key={p.report_type} className="rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900">{p.display_name}</h3>
              <p className="mt-1 text-sm text-slate-600">{p.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="text-sm text-slate-600">
                  Price (NAD)
                  <input
                    type="number"
                    defaultValue={p.price_nad}
                    className="ml-2 w-24 rounded border px-2 py-1"
                    onBlur={(e) => handlePriceUpdate(p.report_type, Number(e.target.value))}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-end gap-4 rounded-2xl bg-slate-50 p-4">
          <label className="text-sm">
            Report type
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="mt-1 block rounded border px-3 py-2"
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
              <input
                value={previewSuburb}
                onChange={(e) => setPreviewSuburb(e.target.value)}
                placeholder="Klein Windhoek"
                className="mt-1 block rounded border px-3 py-2"
              />
            </label>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={handlePreviewReport}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
          >
            Preview
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleGeneratePdf}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Generate PDF
          </button>
        </div>
        {previewData ? (
          <pre className="mt-4 max-h-48 overflow-auto rounded-2xl bg-slate-900 p-4 text-xs text-slate-100">
            {JSON.stringify(previewData, null, 2)}
          </pre>
        ) : null}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">B2B client management</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider text-slate-500">
                <th className="py-3 pr-4">Client</th>
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4">Tier</th>
                <th className="py-3 pr-4">Reports/mo</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3">API keys</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="py-3 font-medium">{c.name}</td>
                  <td className="py-3">{c.client_type}</td>
                  <td className="py-3">{c.access_tier}</td>
                  <td className="py-3">{c.reports_pulled_this_month}</td>
                  <td className="py-3">{c.subscription_status}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      {(c.api_keys ?? []).map((k) => (
                        <span key={k.id} className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                          {k.key_prefix}… {k.is_active ? 'active' : 'revoked'}
                          {k.is_active ? (
                            <button type="button" onClick={() => handleRevokeKey(k.id)} className="ml-1 text-red-600">
                              revoke
                            </button>
                          ) : null}
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleGenerateKey(c.id)}
                        className="text-xs font-semibold text-slate-700 underline"
                      >
                        + Generate key
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Data Intelligence API</h2>
        <p className="mt-1 text-sm text-slate-500">Authenticate with header X-RentCredit-Key</p>
        {apiConfig ? (
          <>
            <ul className="mt-4 space-y-2 text-sm">
              {apiConfig.endpoints.map((ep) => (
                <li key={ep.path} className="rounded-2xl bg-slate-50 px-4 py-2 font-mono text-xs">
                  {ep.path} — {ep.description}
                </li>
              ))}
            </ul>
            <h3 className="mt-6 text-sm font-semibold text-slate-800">Rate limits per tier</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {Object.entries(apiConfig.tier_limits).map(([tier, limit]) => (
                <li key={tier}>
                  {tier}: {limit} req/hr
                </li>
              ))}
            </ul>
            <h3 className="mt-6 text-sm font-semibold text-slate-800">Recent usage</h3>
            <ul className="mt-2 max-h-40 overflow-auto text-xs text-slate-600">
              {(apiConfig.usage_logs ?? []).map((log, i) => (
                <li key={i} className="border-b border-slate-100 py-1">
                  {log.b2b_clients?.name ?? 'Unknown'} — {log.endpoint} — {new Date(log.created_at).toLocaleString()}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </div>
  );
}

function StatCard({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <p className="text-xs uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-2 font-semibold text-slate-900 ${small ? 'text-sm' : 'text-3xl'}`}>{value}</p>
    </div>
  );
}

function TrendBadge({ trend }: { trend: string }) {
  const colors =
    trend === 'Rising' ? 'bg-emerald-100 text-emerald-800' : trend === 'Falling' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700';
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${colors}`}>{trend}</span>;
}
