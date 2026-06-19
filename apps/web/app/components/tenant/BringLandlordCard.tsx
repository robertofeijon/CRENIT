'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import api from '../../../src/lib/api';
import { WINDHOEK_SUBURBS } from '../../../src/lib/namibia-locale';
import { tenantInputClass } from '../tenant/tenantUi';

export default function BringLandlordCard() {
  const [landlordEmail, setLandlordEmail] = useState('');
  const [landlordName, setLandlordName] = useState('');
  const [suburb, setSuburb] = useState<string>(WINDHOEK_SUBURBS[0]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!landlordEmail.trim()) {
      setError('Enter your landlord\'s email address.');
      return;
    }
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await api.post('/tenants/bring-landlord', {
        landlord_email: landlordEmail.trim(),
        landlord_name: landlordName.trim() || undefined,
        suburb,
        message: message.trim() || undefined,
      });
      setFeedback(res.data.data?.message || 'Invitation sent.');
      setLandlordEmail('');
      setLandlordName('');
      setMessage('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to send invitation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="tenant-panel border-indigo-200 bg-indigo-50/50">
      <div className="flex items-start gap-3">
        <UserPlus className="mt-0.5 h-5 w-5 shrink-0 text-indigo-700" aria-hidden />
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Bring your landlord</h2>
          <p className="mt-1 text-sm text-slate-600">
            No invite yet? We will email your landlord a link to join CRENIT so you can pay rent and build verified credit.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              value={landlordEmail}
              onChange={(e) => setLandlordEmail(e.target.value)}
              placeholder="Landlord email"
              type="email"
              className={tenantInputClass}
            />
            <input
              value={landlordName}
              onChange={(e) => setLandlordName(e.target.value)}
              placeholder="Landlord name (optional)"
              className={tenantInputClass}
            />
            <select value={suburb} onChange={(e) => setSuburb(e.target.value)} className={tenantInputClass}>
              {WINDHOEK_SUBURBS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Short note (optional)"
              rows={2}
              className={`${tenantInputClass} min-h-[44px] sm:col-span-2`}
            />
          </div>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          {feedback ? <p className="mt-3 text-sm font-medium text-emerald-700">{feedback}</p> : null}
          <button type="button" className="tenant-btn-primary mt-4" disabled={loading} onClick={() => void handleSubmit()}>
            {loading ? 'Sending…' : 'Send landlord invite'}
          </button>
        </div>
      </div>
    </section>
  );
}
