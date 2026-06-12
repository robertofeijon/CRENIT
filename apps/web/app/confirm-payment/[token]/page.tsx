'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Logo from '../../components/ui/Logo';

const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:3001';

export default function ConfirmPaymentPage() {
  const params = useParams();
  const token = String(params?.token || '');
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/public/payment-confirm/${encodeURIComponent(token)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || json?.error || 'Invalid link');
      setPreview(json.data);
    } catch (e: any) {
      setError(e?.message || 'Unable to load payment');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (action: 'confirm' | 'dispute') => {
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/public/payment-confirm/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || json?.error || 'Action failed');
      setDone(action === 'confirm' ? 'Payment confirmed. The tenant score will update shortly.' : 'Dispute recorded. Auto-confirm has been paused.');
    } catch (e: any) {
      setError(e?.message || 'Action failed');
    } finally {
      setActing(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F3F4F6] px-4 py-10">
      <div className="mx-auto max-w-lg rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg">
        <Logo />
        <h1 className="mt-4 text-2xl font-semibold text-[#1A1A1A]">Confirm rent payment</h1>
        <p className="mt-2 text-sm text-slate-600">One-tap confirmation — no login required.</p>

        {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}
        {error ? <p className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}
        {done ? <p className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{done}</p> : null}

        {preview && !done ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl bg-[#F3F4F6] p-4 text-sm">
              <p className="font-semibold text-[#1A1A1A]">N${Number(preview.amount_gross || 0).toLocaleString()}</p>
              <p className="text-slate-600">Due {preview.due_date} · {preview.payment_method}</p>
              <p className="text-slate-500">Status: {preview.status}</p>
            </div>
            {preview.can_confirm ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => void act('confirm')}
                  className="flex-1 rounded-full bg-[#C0392B] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Confirm received
                </button>
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => void act('dispute')}
                  className="flex-1 rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-[#1A1A1A] disabled:opacity-60"
                >
                  Dispute
                </button>
              </div>
            ) : (
              <p className="text-sm text-amber-800">This payment can no longer be confirmed via this link.</p>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}
