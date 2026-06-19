'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '../../../src/lib/api';

export default function AdminPaymentHistoryImportsPanel() {
  const [imports, setImports] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/payment-history-imports');
      setImports(res.data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load imports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (importId: string) => {
    const res = await api.get(`/admin/payment-history-imports/${importId}`);
    setSelected(res.data.data);
  };

  const review = async (importId: string, action: 'approve' | 'reject') => {
    await api.post(`/admin/payment-history-imports/${importId}/review`, { action });
    setSelected(null);
    await load();
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[#1A1A1A]">Payment history imports</h2>
      <p className="mt-1 text-sm text-slate-600">Tenant-submitted retrospective rent CSV — approve to create verified payments.</p>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-slate-500">Loading…</p> : null}
      {!loading && !imports.length ? <p className="mt-4 text-sm text-slate-500">No pending imports.</p> : null}
      <ul className="mt-4 space-y-2">
        {imports.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span>
              {row.row_count} rows · tenant {row.tenant_id?.slice(0, 8)}… · {new Date(row.submitted_at).toLocaleString()}
            </span>
            <button type="button" className="text-sm font-semibold text-[#C0392B] hover:underline" onClick={() => void openDetail(row.id)}>
              Review
            </button>
          </li>
        ))}
      </ul>
      {selected ? (
        <div className="mt-4 rounded-xl border border-slate-200 p-4 text-sm">
          <p className="font-semibold">Import {selected.id}</p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto font-mono text-xs">
            {(selected.entries || []).map((e: any) => (
              <li key={e.id}>
                {e.period_month} · N${e.amount} · {e.on_time ? 'on time' : 'late'}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <button type="button" className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white" onClick={() => void review(selected.id, 'approve')}>
              Approve
            </button>
            <button type="button" className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold" onClick={() => void review(selected.id, 'reject')}>
              Reject
            </button>
            <button type="button" className="text-xs text-slate-500" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
