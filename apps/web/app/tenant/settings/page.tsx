'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Shield, User } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import TenantPageHeader from '../../components/ui/TenantPageHeader';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';
import { tenantInputClass, tenantSelectClass } from '../../components/tenant/tenantUi';
import MarketDataConsentSection from '../../components/settings/MarketDataConsentSection';
import TwoFactorSetupBlock from '../../components/auth/TwoFactorSetupBlock';

export default function TenantSettingsPage() {
  const { user, loading, roleReady } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [twoFactor, setTwoFactor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [methodType, setMethodType] = useState<'CARD' | 'MOBILE_MONEY' | 'EFT'>('EFT');
  const [cardNumber, setCardNumber] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [notificationPrefs, setNotificationPrefs] = useState<any>(null);

  useEffect(() => {
    if (!loading && roleReady && !user) router.replace('/auth');
    if (!loading && roleReady && user) void loadSettings();
  }, [loading, roleReady, user, router]);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [settingsRes, tfaRes] = await Promise.all([api.get('/settings/tenant'), api.get('/auth/2fa/status')]);
      setProfile(settingsRes.data.data.profile);
      setPaymentMethods(settingsRes.data.data.payment_methods || []);
      setNotificationPrefs(settingsRes.data.data.notification_preferences || null);
      setTwoFactor(tfaRes.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load settings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setIsLoading(true);
    setError(null);
    try {
      await api.patch('/settings/profile', {
        full_name: profile.full_name,
        phone: profile.phone,
        income_monthly: profile.income_monthly ? Number(profile.income_monthly) : null,
        employer_name: profile.employer_name,
        address_street: profile.address_street,
        address_suburb: profile.address_suburb,
        address_city: profile.address_city,
      });
      setMessage('Profile updated.');
      await loadSettings();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to save profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const details =
        methodType === 'CARD'
          ? { card_number: cardNumber, provider: 'CARD' }
          : methodType === 'MOBILE_MONEY'
            ? { phone_number: mobilePhone, provider: 'MTC' }
            : { account_hint: 'EFT account' };
      await api.post('/settings/payment-methods', { type: methodType, details, is_default: paymentMethods.length === 0 });
      setMessage('Payment method added.');
      setCardNumber('');
      setMobilePhone('');
      await loadSettings();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to add payment method.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMethod = async (methodId: string) => {
    setIsLoading(true);
    try {
      await api.delete(`/settings/payment-methods/${methodId}`);
      setMessage('Payment method removed.');
      await loadSettings();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to remove payment method.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup2fa = async () => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/2fa/setup');
      setQrDataUrl(res.data.data.qr_data_url || null);
      setManualKey(res.data.data.manual_entry_key || null);
      setMessage(res.data.data.message);
      await loadSettings();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to start 2FA setup.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm2fa = async () => {
    setIsLoading(true);
    try {
      await api.post('/auth/2fa/confirm', { code: confirmCode });
      setQrDataUrl(null);
      setManualKey(null);
      setConfirmCode('');
      setMessage('Two-factor authentication enabled.');
      await loadSettings();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable2fa = async () => {
    if (!confirmCode) {
      setError('Enter your current 2FA code to disable.');
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/auth/2fa/disable', { code: confirmCode });
      setConfirmCode('');
      setMessage('Two-factor authentication disabled.');
      await loadSettings();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to disable 2FA.');
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
      setError(err?.response?.data?.message || 'Unable to save notifications.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || !roleReady || !user) {
    return <p className="text-sm text-slate-500">Loading tenant workspace…</p>;
  }

  return (
    <div className="space-y-6">
      <TenantPageHeader
        badge="Account"
        title="Settings"
        subtitle="Profile, payment methods, security, and notification preferences."
        actions={
          <button type="button" onClick={() => void loadSettings()} disabled={isLoading} className="tenant-btn-secondary">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        }
      />

      <p className="text-sm text-slate-600">
        <Link href="/tenant/kyc" className="font-semibold text-[#C0392B] hover:underline">
          Manage KYC documents →
        </Link>
      </p>

      {error ? <ErrorStateCard message={error} onRetry={() => void loadSettings()} /> : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</p>
      ) : null}
      {isLoading && !profile ? <SkeletonBlocks rows={3} /> : null}

      {profile ? (
        <section className="tenant-panel">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-[#C0392B]" aria-hidden />
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Profile</h2>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <input value={profile.full_name || ''} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} placeholder="Full name" className={tenantInputClass} />
            <input value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="Phone" className={tenantInputClass} />
            <input value={profile.income_monthly || ''} onChange={(e) => setProfile({ ...profile, income_monthly: e.target.value })} placeholder="Monthly income (N$)" type="number" className={tenantInputClass} />
            <input value={profile.employer_name || ''} onChange={(e) => setProfile({ ...profile, employer_name: e.target.value })} placeholder="Employer" className={tenantInputClass} />
            <input value={profile.address_street || ''} onChange={(e) => setProfile({ ...profile, address_street: e.target.value })} placeholder="Street" className={`${tenantInputClass} sm:col-span-2`} />
            <input value={profile.address_suburb || ''} onChange={(e) => setProfile({ ...profile, address_suburb: e.target.value })} placeholder="Suburb" className={tenantInputClass} />
            <input value={profile.address_city || ''} onChange={(e) => setProfile({ ...profile, address_city: e.target.value })} placeholder="City" className={tenantInputClass} />
          </div>
          <button type="button" onClick={() => void handleSaveProfile()} disabled={isLoading} className="tenant-btn-primary mt-6">
            Save profile
          </button>
        </section>
      ) : null}

      <section className="tenant-panel">
        <h2 className="text-lg font-semibold text-[#1A1A1A]">Payment methods</h2>
        <div className="mt-4 space-y-2">
          {paymentMethods.map((method) => (
            <div key={method.id} className="flex items-center justify-between rounded-xl bg-[#F3F4F6] p-4">
              <div>
                <p className="font-semibold text-[#1A1A1A]">{method.type}</p>
                <p className="text-sm text-slate-600">{method.last_four ? `•••• ${method.last_four}` : `ID: ${method.id}`}</p>
              </div>
              <button type="button" onClick={() => void handleDeleteMethod(method.id)} className="text-sm font-semibold text-red-600 hover:text-red-800">
                Remove
              </button>
            </div>
          ))}
          {!paymentMethods.length ? (
            <EmptyStateCard title="No payment methods" description="Add a method to pay rent and enable auto-pay." />
          ) : null}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <select value={methodType} onChange={(e) => setMethodType(e.target.value as typeof methodType)} className={tenantSelectClass}>
            <option value="EFT">EFT</option>
            <option value="CARD">Card</option>
            <option value="MOBILE_MONEY">Mobile money</option>
          </select>
          {methodType === 'CARD' ? (
            <input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="Card number" className={`${tenantInputClass} sm:col-span-2`} />
          ) : methodType === 'MOBILE_MONEY' ? (
            <input value={mobilePhone} onChange={(e) => setMobilePhone(e.target.value)} placeholder="Phone" className={`${tenantInputClass} sm:col-span-2`} />
          ) : (
            <p className="flex items-center text-sm text-slate-500 sm:col-span-2">Use your lease reference when paying by bank transfer.</p>
          )}
        </div>
        <button type="button" onClick={() => void handleAddPaymentMethod()} disabled={isLoading} className="tenant-btn-primary mt-4">
          Add payment method
        </button>
      </section>

      <section className="tenant-panel">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#C0392B]" aria-hidden />
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Two-factor authentication</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Status: {twoFactor?.enabled ? 'Enabled' : twoFactor?.pending_setup ? 'Pending confirmation' : 'Disabled'}
        </p>
        <TwoFactorSetupBlock
          qrDataUrl={qrDataUrl}
          manualKey={manualKey}
          message={null}
          confirmCode={confirmCode}
          onConfirmCodeChange={setConfirmCode}
          twoFactorEnabled={Boolean(twoFactor?.enabled)}
          isLoading={isLoading}
          inputClass={tenantInputClass}
          onSetup={() => void handleSetup2fa()}
          onConfirm={() => void handleConfirm2fa()}
          onDisable={() => void handleDisable2fa()}
          secondaryButtonClass="tenant-btn-secondary"
          primaryButtonClass="tenant-btn-primary"
        />
      </section>

      <MarketDataConsentSection consentType="TENANT_MARKET_DATA" />

      {notificationPrefs ? (
        <section className="tenant-panel">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Notifications</h2>
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
          <button type="button" onClick={() => void handleSaveNotifications()} disabled={isLoading} className="tenant-btn-primary mt-4">
            Save notifications
          </button>
        </section>
      ) : null}
    </div>
  );
}
