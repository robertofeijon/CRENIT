'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import Logo from '../../components/ui/Logo';

export default function VerifyTwoFactorPage() {
  const router = useRouter();
  const { user, role, loading, roleReady, refreshAuthProfile } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && roleReady && !user) {
    router.replace('/auth');
    return null;
  }

  const dashboard =
    role === 'ADMIN' ? '/admin' : role === 'LANDLORD' ? '/landlord/overview' : '/tenant/home';

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
          Enter the 6-digit code from your authenticator app to access your {role === 'ADMIN' ? 'admin' : 'partner'}{' '}
          account.
        </p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          className="mt-6 w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-lg tracking-[0.3em]"
          maxLength={6}
          inputMode="numeric"
          autoComplete="one-time-code"
        />
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
        <button
          type="button"
          onClick={() => void handleVerify()}
          disabled={submitting || code.length < 6}
          className="mt-6 w-full rounded-xl bg-[#C0392B] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Verifying…' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
