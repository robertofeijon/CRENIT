'use client';

import { useState } from 'react';
import api from '../../../src/lib/api';

type PilotSummary = {
  record_count: number;
  suburb_count: number;
  suburbs: string[];
};

type Props = {
  pilotSummary?: PilotSummary;
  suburbOptions: string[];
  clients: { id: string; name: string }[];
  onError: (message: string) => void;
  onSuccess: () => void;
};

export default function SaleCompsPilotPanel({ pilotSummary, suburbOptions, clients, onError, onSuccess }: Props) {
  const [suburb, setSuburb] = useState(suburbOptions[0] ?? '');
  const [salePrice, setSalePrice] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [partnerId, setPartnerId] = useState('');
  const [busy, setBusy] = useState(false);
  const [previewSuburb, setPreviewSuburb] = useState('');
  const [preview, setPreview] = useState<unknown>(null);

  const ingest = async () => {
    const price = Number(salePrice);
    if (!suburb || !Number.isFinite(price) || price <= 0) {
      onError('Suburb and a positive sale price are required.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/admin/data-intelligence/sale-comps/ingest', {
        partner_client_id: partnerId || undefined,
        records: [
          {
            suburb,
            city: 'Windhoek',
            sale_price: price,
            transfer_date: transferDate,
            source_type: 'pilot_manual',
          },
        ],
      });
      setSalePrice('');
      onSuccess();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      onError(apiErr?.response?.data?.message || apiErr?.message || 'Ingest failed.');
    } finally {
      setBusy(false);
    }
  };

  const loadPreview = async () => {
    if (!previewSuburb) return;
    try {
      const res = await api.get(`/admin/data-intelligence/sale-comps/${encodeURIComponent(previewSuburb)}`);
      setPreview(res.data.data);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      onError(apiErr?.response?.data?.message || apiErr?.message || 'Preview failed.');
    }
  };

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-5">
      <h4 className="font-semibold text-[#1A1A1A]">Sale comps pilot</h4>
      <p className="mt-1 text-sm text-slate-600">
        Partner-sourced deeds feed <code className="text-xs">sale_comps_records</code>. Public API:{' '}
        <code className="text-xs">GET /api/v1/suburb/:name/sale-comps</code>.
      </p>
      {pilotSummary ? (
        <p className="mt-2 text-xs text-slate-600">
          {pilotSummary.record_count} records across {pilotSummary.suburb_count} suburb
          {pilotSummary.suburb_count === 1 ? '' : 's'}
          {pilotSummary.suburbs?.length ? `: ${pilotSummary.suburbs.join(', ')}` : ''}.
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          Suburb
          <select
            value={suburb}
            onChange={(e) => setSuburb(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            {suburbOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Sale price (NAD)
          <input
            type="number"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            className="mt-1 block w-32 rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Transfer date
          <input
            type="date"
            value={transferDate}
            onChange={(e) => setTransferDate(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
        {clients.length ? (
          <label className="text-sm">
            Partner (optional)
            <select
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <option value="">—</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void ingest()}
          className="rounded-full bg-sky-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Ingesting…' : 'Ingest record'}
        </button>
      </div>
      <div className="mt-6 flex flex-wrap items-end gap-2 border-t border-sky-200/80 pt-4">
        <label className="text-sm">
          Preview suburb
          <select
            value={previewSuburb}
            onChange={(e) => setPreviewSuburb(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            <option value="">Select</option>
            {suburbOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => void loadPreview()} className="rounded-full border border-slate-300 px-3 py-2 text-sm font-semibold">
          Load pilot API payload
        </button>
      </div>
      {preview ? (
        <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-[#1A1A1A] p-3 text-[11px] text-slate-100">
          {JSON.stringify(preview, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
