'use client';

import { useCallback, useEffect, useState } from 'react';
import { Upload } from 'lucide-react';
import api from '../../../src/lib/api';

const SAMPLE_CSV = `month_year,amount,reference,on_time
2025-01,8500,REF-JAN,yes
2025-02,8500,REF-FEB,yes
2025-03,8500,REF-MAR,no`;

export default function PaymentHistoryImportCard() {
  const [leaseId, setLeaseId] = useState('');
  const [csvText, setCsvText] = useState('');
  const [imports, setImports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [meRes, importsRes] = await Promise.all([api.get('/tenants/me'), api.get('/tenants/payment-history-imports')]);
      const lease = meRes.data.data?.activeLease;
      if (lease?.id) setLeaseId(lease.id);
      setImports(importsRes.data.data || []);
    } catch {
      setImports([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async () => {
    if (!leaseId) {
      setError('An active lease is required before importing history.');
      return;
    }
    if (!csvText.trim()) {
      setError('Paste CSV rows or use the sample template.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.post('/tenants/payment-history-imports', {
        lease_id: leaseId,
        csv_text: csvText,
        source_filename: 'tenant-paste.csv',
      });
      setMessage(res.data.data?.message || 'Import submitted.');
      setCsvText('');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="tenant-panel">
      <div className="flex items-center gap-2">
        <Upload className="h-5 w-5 text-[#C0392B]" aria-hidden />
        <h2 className="text-lg font-semibold text-[#1A1A1A]">Import past rent history</h2>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Upload up to 36 months of prior rent from a bank statement export. Rows are reviewed by CRENIT before they count
        toward your score.
      </p>
      <p className="mt-2 text-xs text-slate-500">Format: <code>month_year,amount,reference,on_time</code> (YYYY-MM)</p>
      <textarea
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
        rows={6}
        placeholder={SAMPLE_CSV}
        className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-xs outline-none focus:border-[#C0392B]/60"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="tenant-btn-secondary text-xs" onClick={() => setCsvText(SAMPLE_CSV)}>
          Use sample template
        </button>
        <button type="button" className="tenant-btn-primary" disabled={loading} onClick={() => void handleSubmit()}>
          {loading ? 'Submitting…' : 'Submit for review'}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-3 text-sm font-medium text-emerald-700">{message}</p> : null}
      {imports.length ? (
        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          {imports.map((row) => (
            <li key={row.id} className="rounded-lg bg-slate-50 px-3 py-2">
              {row.status} · {row.row_count} rows · {new Date(row.submitted_at).toLocaleDateString()}
              {row.rejection_reason ? ` — ${row.rejection_reason}` : ''}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
