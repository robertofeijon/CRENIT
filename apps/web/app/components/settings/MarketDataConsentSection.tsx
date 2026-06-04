'use client';

import { useCallback, useEffect, useState } from 'react';
import { Database, Shield } from 'lucide-react';
import api from '../../../src/lib/api';

type ConsentType = 'LANDLORD_MARKET_DATA' | 'TENANT_MARKET_DATA';

type ConsentRow = {
  consent_type: ConsentType;
  granted: boolean;
  revoked_at: string | null;
  granted_at: string | null;
  terms_version?: string;
};

type Props = {
  consentType: ConsentType;
  title?: string;
  description?: string;
};

export default function MarketDataConsentSection({
  consentType,
  title = 'Market data sharing',
  description = 'Allow CRENIT to use anonymised payment and property statistics (never your name or address) to improve suburb benchmarks and licensed B2B products. You can revoke at any time; new captures stop after revoke.',
}: Props) {
  const [consents, setConsents] = useState<ConsentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/consent/market-intelligence');
      setConsents(res.data?.data ?? []);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiErr?.response?.data?.message || apiErr?.message || 'Unable to load consent status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const row = consents.find((c) => c.consent_type === consentType);
  const isActive = !!(row?.granted && !row?.revoked_at);

  const grant = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      await api.post('/consent/market-intelligence', { consent_type: consentType, terms_version: '1.0' });
      setMessage('Market data sharing enabled. Thank you for helping improve verified benchmarks.');
      await load();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiErr?.response?.data?.message || apiErr?.message || 'Unable to update consent.');
    } finally {
      setLoading(false);
    }
  };

  const revoke = async () => {
    if (!confirm('Revoke market data sharing? Future anonymised captures from your payments will stop.')) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      await api.post('/consent/market-intelligence/revoke', { consent_type: consentType });
      setMessage('Market data sharing revoked. Existing aggregated statistics may remain in anonymised form.');
      await load();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiErr?.response?.data?.message || apiErr?.message || 'Unable to revoke consent.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-[1.25rem] border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex gap-3">
        <Database className="mt-0.5 h-5 w-5 shrink-0 text-[#C0392B]" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">{title}</h2>
          <p className="mt-2 text-sm text-slate-600">{description}</p>
          <p className="mt-3 text-sm">
            Status:{' '}
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {isActive ? 'Sharing enabled' : 'Not sharing'}
            </span>
          </p>
          {row?.granted_at ? (
            <p className="mt-1 text-xs text-slate-500">
              {isActive ? `Granted ${new Date(row.granted_at).toLocaleString()}` : `Revoked ${row.revoked_at ? new Date(row.revoked_at).toLocaleString() : ''}`}
            </p>
          ) : null}
          {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {!isActive ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => void grant()}
                className="rounded-full bg-[#1A1A1A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#111] disabled:opacity-60"
              >
                Enable sharing
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={() => void revoke()}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Revoke sharing
              </button>
            )}
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs text-slate-500">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Only aggregated suburb-level statistics are licensed externally. Individual identities are never sold.
          </p>
        </div>
      </div>
    </section>
  );
}
