'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Smartphone } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import OtpCodeInput from '../../components/auth/OtpCodeInput';
import MarketingAtmosphere from '../../components/marketing/MarketingAtmosphere';
import Logo from '../../components/ui/Logo';
import ThemeToggle from '../../components/ui/ThemeToggle';

export default function VerifyTwoFactorPage() {
  const router = useRouter();
  const { user, role, loading, roleReady, refreshAuthProfile } = useAuth();
  const [code, setCode] = useState('');
  const [twoFactor, setTwoFactor] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [smsSent, setSmsSent] = useState(false);

  const dashboard =
    role === 'ADMIN' ? '/admin' : role === 'LANDLORD' ? '/landlord/overview' : '/tenant/home';

  const loadStatus = useCallback(async () => {
    try {
      const res = await api.get('/auth/2fa/status');
      setTwoFactor(res.data?.data);
    } catch {
      setTwoFactor(null);
    }
  }, []);

  useEffect(() => {
    if (user) void loadStatus();
  }, [user, loadStatus]);

  useEffect(() => {
    if (!loading && roleReady && !user) router.replace('/auth');
  }, [loading, roleReady, user, router]);

  const sendSmsChallenge = async () => {
    setError(null);
    try {
      await api.post('/auth/2fa/sms/send-challenge');
      setSmsSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to send SMS code.');
    }
  };

  useEffect(() => {
    if (twoFactor?.enabled && twoFactor?.method === 'sms' && twoFactor?.sms_available && !smsSent) {
      void sendSmsChallenge();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [twoFactor?.enabled, twoFactor?.method, twoFactor?.sms_available]);

  if (!loading && roleReady && !user) {
    return null;
  }

  const handleVerify = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/auth/2fa/verify-session', { code: code.trim() });
      await refreshAuthProfile();
      router.replace(dashboard);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid code. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isSms = twoFactor?.method === 'sms';

  return (
    <main className="relative min-h-screen text-[var(--rc-text)]">
      <MarketingAtmosphere variant="auth" className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="absolute right-4 top-4 z-10 sm:right-8">
          <ThemeToggle compact />
        </div>

        <div className="mb-8">
          <Logo />
        </div>

        <div className="verify-2fa-card">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--rc-accent-surface)] text-[#C0392B]">
              {isSms ? <Smartphone className="h-5 w-5" aria-hidden /> : <Shield className="h-5 w-5" aria-hidden />}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C0392B]">Step-up security</p>
              <h1 className="text-xl font-semibold text-[var(--rc-text)]">Two-factor verification</h1>
            </div>
          </div>

          <p className="mt-5 text-sm leading-7 text-[var(--rc-text-secondary)]">
            {isSms
              ? `Enter the 6-digit code we sent${twoFactor?.phone_masked ? ` to ${twoFactor.phone_masked}` : ''}.`
              : `Enter the code from your authenticator app to access your ${role === 'ADMIN' ? 'admin' : 'partner'} dashboard.`}
          </p>

          {isSms ? (
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-[#C0392B] hover:underline"
              onClick={() => void sendSmsChallenge()}
            >
              Resend SMS code
            </button>
          ) : null}

          <OtpCodeInput value={code} onChange={setCode} disabled={submitting} />

          {error ? <p className="mt-4 text-center text-sm text-rose-600">{error}</p> : null}

          <button
            type="button"
            disabled={submitting || code.length < 6}
            onClick={() => void handleVerify()}
            className="tenant-btn-primary mt-6 w-full"
          >
            {submitting ? 'Verifying…' : 'Continue to dashboard'}
          </button>

          <Link
            href="/auth"
            className="mt-4 block text-center text-sm font-semibold text-[var(--rc-text-secondary)] transition hover:text-[#C0392B]"
          >
            ← Back to sign in
          </Link>
        </div>
      </MarketingAtmosphere>
    </main>
  );
}
