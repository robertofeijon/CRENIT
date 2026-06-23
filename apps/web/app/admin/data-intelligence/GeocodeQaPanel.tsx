'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../../src/lib/api';

type QaReport = {
  scanned: number;
  flagged_count: number;
  summary: Record<string, number>;
  flags: Array<{
    payment_id: string;
    property_id: string | null;
    property_name: string | null;
    record_suburb: string;
    captured_property_suburb: string | null;
    property_suburb: string | null;
    tenant_suburb: string | null;
    issues: string[];
    distance_m: number | null;
    captured_at: string;
  }>;
};

const ISSUE_LABELS: Record<string, string> = {
  property_suburb_mismatch: 'Record suburb ≠ property',
  property_suburb_changed_since_capture: 'Property suburb edited after capture',
  tenant_property_suburb_mismatch: 'Tenant profile ≠ property',
  missing_property_geo: 'Property missing lat/lng',
  geo_drift: 'Record vs property geo > 1.5km',
  missing_property_link: 'Payment not linked to property',
};

function exportFlagsCsv(flags: QaReport['flags']) {
  const header = [
    'payment_id',
    'property_id',
    'property_name',
    'record_suburb',
    'captured_property_suburb',
    'property_suburb',
    'tenant_suburb',
    'issues',
    'distance_m',
    'captured_at',
  ];
  const rows = flags.map((f) =>
    [
      f.payment_id,
      f.property_id ?? '',
      f.property_name ?? '',
      f.record_suburb,
      f.captured_property_suburb ?? '',
      f.property_suburb ?? '',
      f.tenant_suburb ?? '',
      f.issues.join('|'),
      f.distance_m ?? '',
      f.captured_at,
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(','),
  );
  const blob = new Blob([[header.join(','), ...rows].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `crenit-geocode-qa-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function GeocodeQaPanel({ onError }: { onError: (message: string) => void }) {
  const [report, setReport] = useState<QaReport | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/data-intelligence/geocode-qa', { params: { limit: 120 } });
      setReport(res.data.data);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      onError(apiErr?.response?.data?.message || apiErr?.message || 'Geocode QA failed.');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !report) {
    return <p className="text-sm text-slate-500">Scanning recent market captures…</p>;
  }

  if (!report) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Compares captured <strong>record suburb</strong> to the linked <strong>property</strong> (current and at capture),{' '}
          <strong>tenant profile</strong> suburb, and geo when coordinates exist.
        </p>
        <div className="flex flex-wrap gap-2">
          {report.flags.length ? (
            <button
              type="button"
              onClick={() => exportFlagsCsv(report.flags)}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold"
            >
              Export CSV
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Scanning…' : 'Rescan'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="admin-list-item">
          <p className="text-xs uppercase text-slate-500">Scanned</p>
          <p className="text-2xl font-semibold">{report.scanned}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs uppercase text-amber-800">Flagged</p>
          <p className="text-2xl font-semibold text-amber-950">{report.flagged_count}</p>
        </div>
        {Object.entries(report.summary).map(([key, count]) =>
          count > 0 ? (
            <div key={key} className="rounded-xl border border-slate-200 bg-[#F3F4F6] p-4">
              <p className="text-[10px] uppercase leading-tight text-slate-500">{ISSUE_LABELS[key] ?? key}</p>
              <p className="text-xl font-semibold">{count}</p>
            </div>
          ) : null,
        )}
      </div>

      {report.flags.length ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Property</th>
                <th className="px-3 py-2">Record</th>
                <th className="px-3 py-2">At capture</th>
                <th className="px-3 py-2">Current</th>
                <th className="px-3 py-2">Tenant</th>
                <th className="px-3 py-2">Issues</th>
                <th className="px-3 py-2">Geo Δ</th>
              </tr>
            </thead>
            <tbody>
              {report.flags.map((f) => (
                <tr key={f.payment_id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    {f.property_name ? (
                      <span className="font-medium">{f.property_name}</span>
                    ) : (
                      '—'
                    )}
                    {f.property_id ? (
                      <Link href="/landlord/properties" className="mt-1 block text-xs text-[#C0392B] hover:underline">
                        Review properties
                      </Link>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 font-medium">{f.record_suburb}</td>
                  <td className="px-3 py-2 text-slate-600">{f.captured_property_suburb ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{f.property_suburb ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{f.tenant_suburb ?? '—'}</td>
                  <td className="px-3 py-2">
                    <ul className="space-y-0.5 text-xs text-amber-900">
                      {f.issues.map((i) => (
                        <li key={i}>{ISSUE_LABELS[i] ?? i}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-3 py-2 text-xs">{f.distance_m != null ? `${f.distance_m} m` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          No suburb or geo mismatches in the latest {report.scanned} captures.
        </p>
      )}
    </div>
  );
}
