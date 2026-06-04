'use client';

import { useMemo, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const PLAYGROUND_ENDPOINTS = [
  { id: 'catalog', label: 'Catalog', path: () => '/api/v1/catalog', needsSuburb: false },
  { id: 'suburb', label: 'Suburb detail', path: (s: string) => `/api/v1/suburb/${encodeURIComponent(s)}`, needsSuburb: true },
  { id: 'trends', label: 'Suburb trends', path: (s: string) => `/api/v1/suburb/${encodeURIComponent(s)}/trends`, needsSuburb: true },
  { id: 'city', label: 'City overview', path: () => '/api/v1/city-overview', needsSuburb: false },
  { id: 'lender', label: 'Lender risk', path: (s: string) => `/api/v1/lender-risk/${encodeURIComponent(s)}`, needsSuburb: true },
  { id: 'reports', label: 'Report catalog', path: () => '/api/v1/reports', needsSuburb: false },
] as const;

type Props = {
  apiKey: string | null;
  suburbOptions: string[];
  onError: (message: string) => void;
};

export default function B2bApiPlayground({ apiKey, suburbOptions, onError }: Props) {
  const [endpointId, setEndpointId] = useState<(typeof PLAYGROUND_ENDPOINTS)[number]['id']>('suburb');
  const [suburb, setSuburb] = useState('');
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState<unknown>(null);
  const [lastPath, setLastPath] = useState('');
  const [copied, setCopied] = useState(false);

  const endpoint = PLAYGROUND_ENDPOINTS.find((e) => e.id === endpointId)!;
  const path = useMemo(() => {
    if (endpoint.needsSuburb && suburb) return endpoint.path(suburb);
    if (!endpoint.needsSuburb) return endpoint.path(suburb);
    return '';
  }, [endpoint, suburb]);

  const curl = apiKey
    ? `curl -sS -H "X-CRENIT-Key: ${apiKey}" "${API_BASE}${path}"`
    : `curl -sS -H "X-CRENIT-Key: YOUR_KEY" "${API_BASE}${path || '/api/v1/...'}"`;

  const run = async () => {
    if (!apiKey) {
      onError('Generate an API key below to run the playground.');
      return;
    }
    if (endpoint.needsSuburb && !suburb) {
      onError('Select a suburb for this endpoint.');
      return;
    }
    setBusy(true);
    setResponse(null);
    try {
      const res = await fetch(`${API_BASE}${path}`, { headers: { 'X-CRENIT-Key': apiKey } });
      const text = await res.text();
      let parsed: unknown = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text.slice(0, 500) };
      }
      if (!res.ok) {
        const msg =
          (parsed as { message?: string })?.message ||
          (parsed as { error?: string })?.error ||
          `Request failed (${res.status})`;
        throw new Error(msg);
      }
      setResponse(parsed);
      setLastPath(path);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Playground request failed.');
    } finally {
      setBusy(false);
    }
  };

  const copyCurl = async () => {
    try {
      await navigator.clipboard.writeText(curl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onError('Could not copy curl.');
    }
  };

  const envelope = (response as { data?: Record<string, unknown> })?.data;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-[#1A1A1A]">B2B API playground</h3>
      <p className="mt-1 text-sm text-slate-600">
        Live-call any JSON route with a client key. Full reference:{' '}
        <code className="text-xs">docs/B2B_INTEGRATOR_GUIDE.md</code>
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          Endpoint
          <select
            value={endpointId}
            onChange={(e) => setEndpointId(e.target.value as (typeof PLAYGROUND_ENDPOINTS)[number]['id'])}
            className="mt-1 block min-w-[10rem] rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            {PLAYGROUND_ENDPOINTS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </label>
        {endpoint.needsSuburb ? (
          <label className="text-sm">
            Suburb
            <select
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
              className="mt-1 block min-w-[12rem] rounded-lg border border-slate-200 bg-white px-3 py-2"
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
          onClick={() => void run()}
          className="rounded-full bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Calling…' : 'Run request'}
        </button>
        <button
          type="button"
          onClick={() => void copyCurl()}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold"
        >
          {copied ? 'Copied' : 'Copy curl'}
        </button>
      </div>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-[#1A1A1A] p-3 text-[11px] text-slate-100">{curl}</pre>
      {envelope && typeof envelope === 'object' ? (
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {'transaction_count' in envelope ? (
            <span className="rounded-full bg-slate-100 px-2 py-1">n={String(envelope.transaction_count)}</span>
          ) : null}
          {'confidence_level' in envelope ? (
            <span className="rounded-full bg-slate-100 px-2 py-1">{String(envelope.confidence_level)}</span>
          ) : null}
          {'data_source' in envelope ? (
            <span className="rounded-full bg-slate-100 px-2 py-1">{String(envelope.data_source)}</span>
          ) : null}
          {envelope.minimum_sample_not_met ? (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-900">minimum not met</span>
          ) : null}
          {envelope.commercially_licensable ? (
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-900">licensable</span>
          ) : null}
        </div>
      ) : null}
      {response ? (
        <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-[#1A1A1A] p-4 text-xs text-slate-100">
          {JSON.stringify(response, null, 2)}
        </pre>
      ) : (
        <p className="mt-4 text-xs text-slate-500">
          {lastPath ? `Last: ${lastPath}` : 'Response appears here after Run request.'}
        </p>
      )}
    </div>
  );
}
