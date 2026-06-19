'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import Logo from '../../components/ui/Logo';

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F3F4F6] px-4">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="flex items-center gap-2 text-[#C0392B]">
          <Shield className="h-6 w-6" aria-hidden />
          <h1 className="text-xl font-semibold text-[#1A1A1A]">Two-factor verification</h1>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {isSms
            ? `Enter the 6-digit code we sent${twoFactor?.phone_masked ? ` to ${twoFactor.phone_masked}` : ''}.`
            : `Enter the 6-digit code from your authenticator app to access your ${role === 'ADMIN' ? 'admin' : 'partner'} dashboard.`}
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
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="6-digit code"
          className="mt-6 w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-lg tracking-widest outline-none focus:border-[#C0392B]/60"
          inputMode="numeric"
          maxLength={6}
        />
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <button
          type="button"
          disabled={submitting || code.length < 6}
          onClick={() => void handleVerify()}
          className="mt-6 w-full rounded-full bg-[#C0392B] px-6 py-3 text-sm font-semibold text-white hover:bg-[#992d24] disabled:opacity-60"
        >
          {submitting ? 'Verifying…' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
