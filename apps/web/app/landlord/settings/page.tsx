"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function LandlordSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [payout, setPayout] = useState<any>(null);
  const [twoFactor, setTwoFactor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [setupCode, setSetupCode] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [notificationPrefs, setNotificationPrefs] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user) loadSettings();
  }, [loading, user, router]);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [settingsRes, tfaRes] = await Promise.all([api.get('/settings/landlord'), api.get('/auth/2fa/status')]);
      setProfile(settingsRes.data.data.profile);
      setPayout(settingsRes.data.data.payout);
      setNotificationPrefs(settingsRes.data.data.notification_preferences || null);
      setTwoFactor(tfaRes.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await api.patch('/settings/landlord', { profile, payout });
      setMessage('Settings saved.');
      await loadSettings();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to save settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup2fa = async () => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/2fa/setup');
      setSetupCode(res.data.data.verification_code);
      setMessage(res.data.data.message);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to start 2FA setup.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm2fa = async () => {
    setIsLoading(true);
    try {
      await api.post('/auth/2fa/confirm', { code: confirmCode });
      setSetupCode(null);
      setConfirmCode('');
      setMessage('2FA enabled.');
      await loadSettings();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Invalid code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable2fa = async () => {
    setIsLoading(true);
    try {
      await api.post('/auth/2fa/disable', { code: confirmCode });
      setMessage('2FA disabled.');
      await loadSettings();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to disable 2FA.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!notificationPrefs) return;
    setIsLoading(true);
    try {
      await api.patch('/settings/notifications', notificationPrefs);
      setMessage('Notification preferences saved.');
      await loadSettings();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to save notification preferences.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-slate-50 p-8">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">Landlord settings</h1>
          <p className="mt-3 text-sm text-slate-600">Profile, payout bank details, and security.</p>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

        {profile && payout ? (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Profile</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <input value={profile.full_name || ''} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} placeholder="Full name" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                <input value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="Phone" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Payout account</h2>
              <p className="mt-2 text-sm text-slate-500">Partner status: {payout.partner_status}</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <input value={payout.business_name || ''} onChange={(e) => setPayout({ ...payout, business_name: e.target.value })} placeholder="Business name" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm sm:col-span-2" />
                <input value={payout.bank_name || ''} onChange={(e) => setPayout({ ...payout, bank_name: e.target.value })} placeholder="Bank name" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                <input value={payout.bank_account_name || ''} onChange={(e) => setPayout({ ...payout, bank_account_name: e.target.value })} placeholder="Account name" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                <input value={payout.bank_account_number || ''} onChange={(e) => setPayout({ ...payout, bank_account_number: e.target.value })} placeholder="Account number" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                <input value={payout.bank_branch_code || ''} onChange={(e) => setPayout({ ...payout, bank_branch_code: e.target.value })} placeholder="Branch code" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                <input value={payout.payout_email || ''} onChange={(e) => setPayout({ ...payout, payout_email: e.target.value })} placeholder="Payout email" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
              </div>
              <button onClick={handleSave} disabled={isLoading} className="mt-6 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                Save settings
              </button>
            </section>
          </>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Two-factor authentication</h2>
          <p className="mt-2 text-sm text-slate-500">Status: {twoFactor?.enabled ? 'Enabled' : 'Disabled'}</p>
          {setupCode ? <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm">Setup code: <strong>{setupCode}</strong></p> : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <input value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)} placeholder="6-digit code" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" maxLength={6} />
            {!twoFactor?.enabled ? (
              <>
                <button onClick={handleSetup2fa} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold">Generate code</button>
                <button onClick={handleConfirm2fa} className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white">Enable</button>
              </>
            ) : (
              <button onClick={handleDisable2fa} className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white">Disable</button>
            )}
          </div>
        </section>

        {notificationPrefs ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Notifications</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ['email_enabled', 'Email notifications'],
                ['sms_enabled', 'SMS notifications'],
                ['rent_reminders', 'Rent reminders'],
                ['payment_confirmations', 'Payment confirmations'],
                ['kyc_updates', 'KYC updates'],
                ['lease_events', 'Lease events'],
                ['deposit_events', 'Deposit events'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(notificationPrefs[key])}
                    onChange={(e) => setNotificationPrefs({ ...notificationPrefs, [key]: e.target.checked })}
                    disabled={key === 'sms_enabled' && process.env.NEXT_PUBLIC_SMS_ENABLED !== 'true'}
                  />
                  {label}
                </label>
              ))}
            </div>
            <button onClick={handleSaveNotifications} disabled={isLoading} className="mt-4 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
              Save notification preferences
            </button>
          </section>
        ) : null}
      </div>
    </main>
  );
}
