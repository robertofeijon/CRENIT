'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '../../../src/lib/api';

type WatchRow = {
  suburb: string;
  city: string;
  commercially_licensable: boolean;
  transaction_count: number;
  median_rent: number | null;
  updated_at: string;
};

export default function LicensableWatchPanel() {
  const [rows, setRows] = useState<WatchRow[]>([]);
  const [licensableCount, setLicensableCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/data-intelligence/licensable-watch');
      setRows(res.data.data?.suburbs ?? []);
      setLicensableCount(res.data.data?.licensable_count ?? 0);
    } catch {
      setRows([]);
      setLicensableCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading webhook watch state…</p>;
  }

  if (!rows.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        No suburbs in the watch table yet. Run <strong>Sync licensable suburbs</strong> on the B2B tab or wait for nightly
        rollup.
      </p>
    );
  }

  const licensable = rows.filter((r) => r.commercially_licensable);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold text-[#1A1A1A]">Webhook watch table</h4>
        <p className="text-xs text-slate-500">
          {licensableCount} licensable · {rows.length} tracked
        </p>
      </div>
      <p className="mt-1 text-xs text-slate-600">
        Persists licensable state so <code className="text-[10px]">suburb.licensable</code> fires only on 0→1 transitions.
      </p>
      <div className="mt-4 max-h-56 overflow-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-2 py-2">Suburb</th>
              <th className="px-2 py-2">n</th>
              <th className="px-2 py-2">Median</th>
              <th className="px-2 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {licensable.slice(0, 20).map((r) => (
              <tr key={`${r.suburb}-${r.city}`} className="border-t border-slate-100">
                <td className="px-2 py-2 font-medium">
                  {r.suburb}
                  <span className="text-slate-400"> · {r.city}</span>
                </td>
                <td className="px-2 py-2">{r.transaction_count}</td>
                <td className="px-2 py-2">{r.median_rent != null ? `N$${Math.round(r.median_rent).toLocaleString()}` : '—'}</td>
                <td className="px-2 py-2">
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">Licensable</span>
                </td>
              </tr>
            ))}
            {rows.length > licensable.length ? (
              <tr className="border-t border-slate-100 text-slate-400">
                <td colSpan={4} className="px-2 py-2">
                  +{rows.length - licensable.length} suburb(s) below licensable threshold
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => void load()} className="mt-3 text-xs font-semibold text-[#C0392B] hover:underline">
        Refresh watch table
      </button>
    </div>
  );
}
