"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function TenantSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [twoFactor, setTwoFactor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [setupCode, setSetupCode] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [methodType, setMethodType] = useState<'CARD' | 'MOBILE_MONEY' | 'EFT'>('EFT');
  const [cardNumber, setCardNumber] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user) loadSettings();
  }, [loading, user, router]);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [settingsRes, tfaRes] = await Promise.all([api.get('/settings/tenant'), api.get('/auth/2fa/status')]);
      setProfile(settingsRes.data.data.profile);
      setPaymentMethods(settingsRes.data.data.payment_methods || []);
      setTwoFactor(tfaRes.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load settings.');
    } finally {
      setIsLoading(false);
    }
  };

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
      setError(err?.response?.data?.message || err?.message || 'Unable to save profile.');
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
      setError(err?.response?.data?.message || err?.message || 'Unable to add payment method.');
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
      setError(err?.response?.data?.message || err?.message || 'Unable to remove payment method.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup2fa = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/2fa/setup');
      setSetupCode(res.data.data.verification_code);
      setMessage(res.data.data.message);
      await loadSettings();
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
      setMessage('Two-factor authentication enabled.');
      await loadSettings();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Invalid verification code.');
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
      setError(err?.response?.data?.message || err?.message || 'Unable to disable 2FA.');
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
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="mt-3 text-sm text-slate-600">Profile, linked accounts, and security.</p>
          <Link href="/tenant/kyc" className="mt-4 inline-flex text-sm font-semibold text-brand-red hover:underline">
            Manage KYC documents →
          </Link>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

        {profile ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Profile</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <input value={profile.full_name || ''} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} placeholder="Full name" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
              <input value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="Phone" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
              <input value={profile.income_monthly || ''} onChange={(e) => setProfile({ ...profile, income_monthly: e.target.value })} placeholder="Monthly income N$" type="number" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
              <input value={profile.employer_name || ''} onChange={(e) => setProfile({ ...profile, employer_name: e.target.value })} placeholder="Employer" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
              <input value={profile.address_street || ''} onChange={(e) => setProfile({ ...profile, address_street: e.target.value })} placeholder="Street" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm sm:col-span-2" />
              <input value={profile.address_suburb || ''} onChange={(e) => setProfile({ ...profile, address_suburb: e.target.value })} placeholder="Suburb" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
              <input value={profile.address_city || ''} onChange={(e) => setProfile({ ...profile, address_city: e.target.value })} placeholder="City" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
            </div>
            <button onClick={handleSaveProfile} disabled={isLoading} className="mt-6 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
              Save profile
            </button>
          </section>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Payment methods</h2>
          <div className="mt-6 space-y-3">
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <div>
                  <p className="font-semibold text-slate-900">{method.type}</p>
                  <p className="text-sm text-slate-600">{method.last_four ? `•••• ${method.last_four}` : 'Linked account'}</p>
                </div>
                <button onClick={() => handleDeleteMethod(method.id)} className="text-sm font-semibold text-red-600">
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <select value={methodType} onChange={(e) => setMethodType(e.target.value as any)} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm">
              <option value="EFT">EFT</option>
              <option value="CARD">Card</option>
              <option value="MOBILE_MONEY">Mobile money</option>
            </select>
            {methodType === 'CARD' ? (
              <input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="Card number" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm sm:col-span-2" />
            ) : methodType === 'MOBILE_MONEY' ? (
              <input value={mobilePhone} onChange={(e) => setMobilePhone(e.target.value)} placeholder="Phone" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm sm:col-span-2" />
            ) : (
              <div className="sm:col-span-2 text-sm text-slate-500 flex items-center">Bank transfer uses your lease reference at payment time.</div>
            )}
          </div>
          <button onClick={handleAddPaymentMethod} disabled={isLoading} className="mt-4 rounded-2xl bg-brand-red px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
            Add payment method
          </button>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Two-factor authentication</h2>
          <p className="mt-2 text-sm text-slate-500">Status: {twoFactor?.enabled ? 'Enabled' : twoFactor?.pending_setup ? 'Pending confirmation' : 'Disabled'}</p>
          {setupCode ? (
            <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">Your setup code: <strong>{setupCode}</strong></p>
          ) : null}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)} placeholder="6-digit code" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" maxLength={6} />
            {!twoFactor?.enabled ? (
              <>
                <button onClick={handleSetup2fa} disabled={isLoading} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold">
                  Generate code
                </button>
                <button onClick={handleConfirm2fa} disabled={isLoading} className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white">
                  Confirm enable
                </button>
              </>
            ) : (
              <button onClick={handleDisable2fa} disabled={isLoading} className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white">
                Disable 2FA
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
