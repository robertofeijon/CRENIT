'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '../../../src/lib/api';

type WebhookRow = { id: string; url: string; is_active: boolean; events: string[] };
type DeliveryRow = {
  id: string;
  event_type: string;
  response_status: number | null;
  created_at: string;
  suburb: string | null;
  url: string | null;
  client_name: string | null;
};

type Props = {
  clients: { id: string; name: string }[];
  onError: (message: string) => void;
  onMessage: (message: string) => void;
};

export default function B2bWebhookAdmin({ clients, onError, onMessage }: Props) {
  const [syncBusy, setSyncBusy] = useState(false);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [webhooksByClient, setWebhooksByClient] = useState<Record<string, WebhookRow[]>>({});
  const [urlByClient, setUrlByClient] = useState<Record<string, string>>({});
  const [registerBusy, setRegisterBusy] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [watchCount, setWatchCount] = useState<number | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const loadDeliveries = useCallback(async () => {
    try {
      const res = await api.get('/admin/data-intelligence/webhooks/deliveries', { params: { limit: 30 } });
      setDeliveries(res.data.data ?? []);
    } catch {
      setDeliveries([]);
    }
  }, []);

  const loadWatch = useCallback(async () => {
    try {
      const res = await api.get('/admin/data-intelligence/licensable-watch');
      setWatchCount(res.data.data?.licensable_count ?? 0);
    } catch {
      setWatchCount(null);
    }
  }, []);

  useEffect(() => {
    void loadDeliveries();
    void loadWatch();
  }, [loadDeliveries, loadWatch]);

  const syncLicensable = async () => {
    setSyncBusy(true);
    try {
      const res = await api.post('/admin/data-intelligence/webhooks/sync-licensable');
      const d = res.data.data as { newly_licensable?: number; synced?: number };
      onMessage(
        `Licensable sync complete — ${d?.newly_licensable ?? 0} newly licensable (${d?.synced ?? 0} suburbs tracked).`,
      );
      await loadDeliveries();
      await loadWatch();
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
    setRevealedSecret(null);
    try {
      const res = await api.post(`/admin/data-intelligence/b2b-clients/${clientId}/webhooks`, {
        url,
        events: ['suburb.licensable'],
      });
      const secret = res.data.data?.secret as string | undefined;
      if (secret) setRevealedSecret(secret);
      setUrlByClient((prev) => ({ ...prev, [clientId]: '' }));
      await loadWebhooks(clientId);
      onMessage('Webhook registered — copy the signing secret below (shown once).');
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      onError(apiErr?.response?.data?.message || apiErr?.message || 'Register failed.');
    } finally {
      setRegisterBusy(null);
    }
  };

  const deactivate = async (clientId: string, subscriptionId: string) => {
    setActionBusy(subscriptionId);
    try {
      await api.delete(`/admin/data-intelligence/b2b-clients/${clientId}/webhooks/${subscriptionId}`);
      await loadWebhooks(clientId);
      onMessage('Webhook deactivated.');
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      onError(apiErr?.response?.data?.message || apiErr?.message || 'Deactivate failed.');
    } finally {
      setActionBusy(null);
    }
  };

  const testDelivery = async (subscriptionId: string) => {
    setActionBusy(`test-${subscriptionId}`);
    try {
      const res = await api.post(`/admin/data-intelligence/webhooks/${subscriptionId}/test`);
      const status = res.data.data?.response_status;
      onMessage(`Test delivery sent${status != null ? ` (HTTP ${status})` : ''}.`);
      await loadDeliveries();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      onError(apiErr?.response?.data?.message || apiErr?.message || 'Test delivery failed.');
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
      <h3 className="font-semibold text-[#1A1A1A]">Licensable suburb webhooks</h3>
      <p className="mt-1 text-sm text-slate-600">
        Fires <code className="text-xs">suburb.licensable</code> when a suburb crosses n≥10 verified samples.
        {watchCount != null ? (
          <span className="ml-1 font-medium text-emerald-900">Watch table: {watchCount} licensable suburb(s).</span>
        ) : null}
      </p>
      <button
        type="button"
        disabled={syncBusy}
        onClick={() => void syncLicensable()}
        className="mt-4 rounded-full bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {syncBusy ? 'Syncing…' : 'Sync licensable suburbs now'}
      </button>

      {revealedSecret ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
          <p className="font-semibold">Signing secret (copy now)</p>
          <code className="mt-2 block break-all rounded bg-white p-2 font-mono">{revealedSecret}</code>
          <button type="button" onClick={() => setRevealedSecret(null)} className="mt-2 underline">
            Dismiss
          </button>
        </div>
      ) : null}

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
                  <ul className="mb-3 space-y-2 text-xs text-slate-600">
                    {(webhooksByClient[c.id] ?? []).length ? (
                      webhooksByClient[c.id].map((w) => (
                        <li key={w.id} className="rounded-lg bg-slate-50 p-2">
                          <p className="font-mono break-all">{w.url}</p>
                          <p className="mt-1">
                            {w.is_active ? 'active' : 'inactive'} · {(w.events ?? []).join(', ')}
                          </p>
                          {w.is_active ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={actionBusy != null}
                                onClick={() => void testDelivery(w.id)}
                                className="text-[#C0392B] font-semibold hover:underline"
                              >
                                {actionBusy === `test-${w.id}` ? 'Sending…' : 'Send test'}
                              </button>
                              <button
                                type="button"
                                disabled={actionBusy != null}
                                onClick={() => void deactivate(c.id, w.id)}
                                className="text-slate-500 hover:underline"
                              >
                                {actionBusy === w.id ? '…' : 'Deactivate'}
                              </button>
                            </div>
                          ) : null}
                        </li>
                      ))
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

      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recent deliveries</p>
        {deliveries.length ? (
          <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs text-slate-600">
            {deliveries.map((d) => (
              <li key={d.id} className="border-b border-slate-100 py-1.5">
                {d.client_name ?? '—'} · {d.event_type}
                {d.suburb ? ` · ${d.suburb}` : ''}
                {d.response_status != null ? ` · HTTP ${d.response_status}` : ' · failed'}
                {' · '}
                {new Date(d.created_at).toLocaleString()}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-slate-400">No deliveries logged yet — run sync or send a test.</p>
        )}
      </div>
    </div>
  );
}
