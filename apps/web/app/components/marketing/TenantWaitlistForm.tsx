'use client';

import { useState } from 'react';
import axios from 'axios';
import { MapPin } from 'lucide-react';
import { WINDHOEK_SUBURBS } from '../../../src/lib/namibia-locale';

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function TenantWaitlistForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [suburb, setSuburb] = useState<string>(WINDHOEK_SUBURBS[0]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await axios.post(`${apiBase}/public/waitlist`, {
        email: email.trim(),
        full_name: fullName.trim() || undefined,
        suburb,
      });
      setMessage(res.data.data?.message || 'You are on the waitlist.');
      setEmail('');
      setFullName('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to join waitlist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={compact ? '' : 'rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm'}>
      {!compact ? (
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-[#C0392B]" aria-hidden />
          <h3 className="text-lg font-semibold text-[#1A1A1A]">Join the tenant waitlist</h3>
        </div>
      ) : null}
      <p className={`text-sm text-slate-600 ${compact ? '' : 'mt-2'}`}>
        Get notified when verified landlords join your suburb on CRENIT.
      </p>
      <div className={`grid gap-3 ${compact ? 'mt-3' : 'mt-4'} sm:grid-cols-2`}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          type="email"
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#C0392B]/60"
        />
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your name (optional)"
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#C0392B]/60"
        />
        <select
          value={suburb}
          onChange={(e) => setSuburb(e.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#C0392B]/60 sm:col-span-2"
        >
          {WINDHOEK_SUBURBS.map((s) => (
            <option key={s} value={s}>
              {s}, Windhoek
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-3 text-sm font-medium text-emerald-700">{message}</p> : null}
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleSubmit()}
        className={`mt-4 inline-flex items-center justify-center rounded-full bg-[#C0392B] px-6 py-3 text-sm font-semibold text-white hover:bg-[#992d24] disabled:opacity-60 ${compact ? 'w-full' : ''}`}
      >
        {loading ? 'Joining…' : 'Notify me'}
      </button>
    </div>
  );
}
