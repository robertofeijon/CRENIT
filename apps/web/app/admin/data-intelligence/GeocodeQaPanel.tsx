'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '../../../src/lib/api';

type QaReport = {
  scanned: number;
  flagged_count: number;
  summary: Record<string, number>;
  flags: Array<{
    payment_id: string;
    record_suburb: string;
    property_suburb: string | null;
    tenant_suburb: string | null;
    issues: string[];
    distance_m: number | null;
    captured_at: string;
  }>;
};

const ISSUE_LABELS: Record<string, string> = {
  property_suburb_mismatch: 'Record suburb ≠ property',
  tenant_property_suburb_mismatch: 'Tenant profile ≠ property',
  missing_property_geo: 'Property missing lat/lng',
  geo_drift: 'Record vs property geo > 1.5km',
  missing_property_link: 'Payment not linked to property',
};

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
          Compares each captured payment&apos;s <strong>record suburb</strong> to the linked <strong>property</strong> and{' '}
          <strong>tenant profile</strong> suburbs, plus geo drift when coordinates exist.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? 'Scanning…' : 'Rescan'}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
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
                <th className="px-3 py-2">Record suburb</th>
                <th className="px-3 py-2">Property</th>
                <th className="px-3 py-2">Tenant</th>
                <th className="px-3 py-2">Issues</th>
                <th className="px-3 py-2">Geo Δ</th>
              </tr>
            </thead>
            <tbody>
              {report.flags.map((f) => (
                <tr key={f.payment_id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{f.record_suburb}</td>
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
