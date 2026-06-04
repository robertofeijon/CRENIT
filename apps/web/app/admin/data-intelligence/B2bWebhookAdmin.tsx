'use client';

import { useState } from 'react';
import api from '../../../src/lib/api';

type Props = {
  clients: { id: string; name: string }[];
  onError: (message: string) => void;
  onMessage: (message: string) => void;
};

export default function B2bWebhookAdmin({ clients, onError, onMessage }: Props) {
  const [syncBusy, setSyncBusy] = useState(false);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [webhooksByClient, setWebhooksByClient] = useState<Record<string, unknown[]>>({});
  const [urlByClient, setUrlByClient] = useState<Record<string, string>>({});
  const [registerBusy, setRegisterBusy] = useState<string | null>(null);

  const syncLicensable = async () => {
    setSyncBusy(true);
    try {
      const res = await api.post('/admin/data-intelligence/webhooks/sync-licensable');
      const d = res.data.data as { newly_licensable?: number; synced?: number };
      onMessage(
        `Licensable sync complete — ${d?.newly_licensable ?? 0} newly licensable (${d?.synced ?? 0} suburbs tracked).`,
      );
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      onError(apiErr?.response?.data?.message || apiErr?.message || 'Webhook sync failed.');
    } finally {
      setSyncBusy(false);
    }
  };

  const loadWebhooks = async (clientId: string) => {
    try {
      const res = await api.get(`/admin/data-intelligence/b2b-clients/${clientId}/webhooks`);
      setWebhooksByClient((prev) => ({ ...prev, [clientId]: res.data.data ?? [] }));
    } catch {
      onError('Could not load webhooks for client.');
    }
  };

  const toggleClient = async (clientId: string) => {
    if (expandedClient === clientId) {
      setExpandedClient(null);
      return;
    }
    setExpandedClient(clientId);
    if (!webhooksByClient[clientId]) await loadWebhooks(clientId);
  };

  const register = async (clientId: string) => {
    const url = urlByClient[clientId]?.trim();
    if (!url) {
      onError('Enter a webhook URL.');
      return;
    }
    setRegisterBusy(clientId);
    try {
      await api.post(`/admin/data-intelligence/b2b-clients/${clientId}/webhooks`, {
        url,
        events: ['suburb.licensable'],
      });
      setUrlByClient((prev) => ({ ...prev, [clientId]: '' }));
      await loadWebhooks(clientId);
      onMessage('Webhook registered (HMAC-signed POST on suburb.licensable).');
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      onError(apiErr?.response?.data?.message || apiErr?.message || 'Register failed.');
    } finally {
      setRegisterBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
      <h3 className="font-semibold text-[#1A1A1A]">Licensable suburb webhooks</h3>
      <p className="mt-1 text-sm text-slate-600">
        Fires <code className="text-xs">suburb.licensable</code> when a suburb crosses n≥10 verified samples. Nightly rollup and
        04:00 Windhoek cron also run sync.
      </p>
      <button
        type="button"
        disabled={syncBusy}
        onClick={() => void syncLicensable()}
        className="mt-4 rounded-full bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {syncBusy ? 'Syncing…' : 'Sync licensable suburbs now'}
      </button>

      {clients.length ? (
        <div className="mt-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Subscriptions by client</p>
          {clients.map((c) => (
            <div key={c.id} className="rounded-lg border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => void toggleClient(c.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold"
              >
                {c.name}
                <span className="text-xs text-slate-500">{expandedClient === c.id ? 'Hide' : 'Webhooks'}</span>
              </button>
              {expandedClient === c.id ? (
                <div className="border-t border-slate-100 px-4 py-3">
                  <ul className="mb-3 space-y-1 text-xs text-slate-600">
                    {(webhooksByClient[c.id] ?? []).length ? (
                      (webhooksByClient[c.id] as { id: string; url: string; is_active: boolean; events: string[] }[]).map(
                        (w) => (
                          <li key={w.id} className="font-mono">
                            {w.url} · {w.is_active ? 'active' : 'inactive'} · {(w.events ?? []).join(', ')}
                          </li>
                        ),
                      )
                    ) : (
                      <li className="text-slate-400">No webhooks yet.</li>
                    )}
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="url"
                      placeholder="https://partner.example/hooks/crenit"
                      value={urlByClient[c.id] ?? ''}
                      onChange={(e) => setUrlByClient((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      disabled={registerBusy === c.id}
                      onClick={() => void register(c.id)}
                      className="rounded-full bg-[#1A1A1A] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {registerBusy === c.id ? '…' : 'Register'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
