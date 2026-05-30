'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, RefreshCw, Shield, User } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import LandlordPageHeader from '../../components/ui/LandlordPageHeader';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import { landlordInputClass, statusPillClass } from '../../components/landlord/landlordUi';

export default function LandlordSettingsPage() {
  const { user, role, loading } = useAuth();
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
    if (!loading && user && role && role !== 'LANDLORD' && role !== 'ADMIN') router.replace('/tenant/home');
  }, [loading, user, role, router]);

  const loadSettings = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (user && (role === 'LANDLORD' || role === 'ADMIN')) void loadSettings();
  }, [user, role, loadSettings]);

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
    return <p className="text-sm text-slate-500">Loading partner workspace…</p>;
  }

  return (
    <div className="space-y-6">
      <LandlordPageHeader
        badge="Account"
        title="Settings"
        subtitle="Profile, payout bank details, security, and notification preferences."
        actions={
          <button type="button" onClick={() => void loadSettings()} disabled={isLoading} className="landlord-btn-secondary">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        }
      />

      {error ? <ErrorStateCard message={error} onRetry={loadSettings} /> : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</p>
      ) : null}

      {isLoading && !profile ? (
        <SkeletonBlocks rows={5} />
      ) : profile && payout ? (
        <>
          <section className="landlord-panel">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-[#C0392B]" aria-hidden />
              <h2 className="text-lg font-semibold text-[#1A1A1A]">Profile</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input value={profile.full_name || ''} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} placeholder="Full name" className={landlordInputClass} />
              <input value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="Phone" className={landlordInputClass} />
            </div>
          </section>

          <section className="landlord-panel">
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Payout account</h2>
            <p className="mt-1 text-sm text-slate-500">
              Partner status:{' '}
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusPillClass(payout.partner_status)}`}>
                {payout.partner_status}
              </span>
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input value={payout.business_name || ''} onChange={(e) => setPayout({ ...payout, business_name: e.target.value })} placeholder="Business name" className={`${landlordInputClass} sm:col-span-2`} />
              <input value={payout.bank_name || ''} onChange={(e) => setPayout({ ...payout, bank_name: e.target.value })} placeholder="Bank name" className={landlordInputClass} />
              <input value={payout.bank_account_name || ''} onChange={(e) => setPayout({ ...payout, bank_account_name: e.target.value })} placeholder="Account name" className={landlordInputClass} />
              <input value={payout.bank_account_number || ''} onChange={(e) => setPayout({ ...payout, bank_account_number: e.target.value })} placeholder="Account number" className={landlordInputClass} />
              <input value={payout.bank_branch_code || ''} onChange={(e) => setPayout({ ...payout, bank_branch_code: e.target.value })} placeholder="Branch code" className={landlordInputClass} />
              <input value={payout.payout_email || ''} onChange={(e) => setPayout({ ...payout, payout_email: e.target.value })} placeholder="Payout email" className={landlordInputClass} />
            </div>
            <button type="button" onClick={handleSave} disabled={isLoading} className="landlord-btn-primary mt-4">
              {isLoading ? 'Saving…' : 'Save settings'}
            </button>
          </section>
        </>
      ) : null}

      <section className="landlord-panel">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#C0392B]" aria-hidden />
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Two-factor authentication</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Status:{' '}
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusPillClass(twoFactor?.enabled ? 'ACTIVE' : 'PENDING')}`}>
            {twoFactor?.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </p>
        {setupCode ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Setup code: <strong>{setupCode}</strong>
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)} placeholder="6-digit code" className={`${landlordInputClass} w-40`} maxLength={6} />
          {!twoFactor?.enabled ? (
            <>
              <button type="button" onClick={handleSetup2fa} className="landlord-btn-secondary">
                Generate code
              </button>
              <button type="button" onClick={handleConfirm2fa} className="landlord-btn-primary bg-emerald-600 hover:bg-emerald-700">
                Enable
              </button>
            </>
          ) : (
            <button type="button" onClick={handleDisable2fa} className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white">
              Disable
            </button>
          )}
        </div>
      </section>

      {notificationPrefs ? (
        <section className="landlord-panel">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#C0392B]" aria-hidden />
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Notifications</h2>
          </div>
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
              <label key={key} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-[#F3F4F6] p-3 text-sm">
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
          <button type="button" onClick={handleSaveNotifications} disabled={isLoading} className="landlord-btn-primary mt-4">
            Save notification preferences
          </button>
        </section>
      ) : null}
    </div>
  );
}
