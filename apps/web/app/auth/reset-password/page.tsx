'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../src/lib/supabaseClient';
import Logo from '../../components/ui/Logo';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage('Password updated. You can sign in now.');
      setTimeout(() => router.replace('/auth'), 1500);
    } catch (err: any) {
      setError(err?.message || 'Unable to update password. Open the link from your email again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F3F4F6] px-4">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <h1 className="text-xl font-semibold text-[#1A1A1A]">Choose a new password</h1>
        {!ready ? (
          <p className="mt-4 text-sm text-slate-600">Open the reset link from your email to continue.</p>
        ) : (
          <>
            <label className="mt-6 block text-sm font-medium text-slate-700">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              autoComplete="new-password"
            />
            <label className="mt-4 block text-sm font-medium text-slate-700">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              autoComplete="new-password"
            />
            {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
            {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || !password || !confirm}
              className="mt-6 w-full rounded-xl bg-[#C0392B] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Update password'}
            </button>
          </>
        )}
        <Link href="/auth" className="mt-4 block text-center text-sm font-semibold text-[#C0392B] hover:underline">
          Back to login
        </Link>
      </div>
    </main>
  );
}
