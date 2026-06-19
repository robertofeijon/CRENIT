'use client';

import { useState } from 'react';
import axios from 'axios';
import { KeyRound } from 'lucide-react';

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type SampleKeyResult = {
  api_key: string;
  expires_in_days: number;
  demo_suburbs: string[];
  illustrative_disclaimer: string;
  sample_endpoints: { suburb: string; json: string; pdf: string }[];
  email_sent?: boolean;
  message?: string;
};

export default function B2bSampleKeyForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SampleKeyResult | null>(null);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Work email is required.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await axios.post(`${apiBase}/public/market-intelligence/sample-key`, {
        email: email.trim(),
        company_name: companyName.trim() || undefined,
      });
      setResult(res.data.data);
      setEmail('');
      setCompanyName('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to provision a sample key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={compact ? '' : 'rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm'}>
      {!compact ? (
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-[#C0392B]" aria-hidden />
          <h3 className="text-lg font-semibold text-[#1A1A1A]">Request a sample API key</h3>
        </div>
      ) : null}
      <p className={`text-sm text-slate-600 ${compact ? '' : 'mt-2'}`}>
        14-day evaluation key for Klein Windhoek, Eros, and Kleine Kuppe — JSON suburb endpoints and sample PDF reports.
      </p>
      <div className={`grid gap-3 ${compact ? 'mt-3' : 'mt-4'} sm:grid-cols-2`}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Work email"
          type="email"
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#C0392B]/60"
        />
        <input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Company (optional)"
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#C0392B]/60"
        />
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {result ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <p className="font-semibold">{result.message || 'Sample key provisioned.'}</p>
          <p className="mt-2 font-mono text-xs break-all">{result.api_key}</p>
          <p className="mt-3 text-xs text-emerald-900">{result.illustrative_disclaimer}</p>
          <ul className="mt-3 space-y-2 text-xs">
            {result.sample_endpoints.map((ep) => (
              <li key={ep.suburb}>
                <span className="font-semibold">{ep.suburb}</span>
                <div className="mt-1 font-mono break-all text-emerald-900">{ep.json}</div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleSubmit()}
        className={`mt-4 inline-flex items-center justify-center rounded-full bg-[#C0392B] px-6 py-3 text-sm font-semibold text-white hover:bg-[#992d24] disabled:opacity-60 ${compact ? 'w-full' : ''}`}
      >
        {loading ? 'Provisioning…' : 'Get sample key'}
      </button>
    </div>
  );
}
