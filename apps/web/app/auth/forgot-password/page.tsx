'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../src/lib/supabaseClient';
import Logo from '../../components/ui/Logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const redirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : undefined;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (resetError) throw resetError;
      setMessage('If an account exists for this email, you will receive a password reset link shortly.');
    } catch (err: any) {
      setError(err?.message || 'Unable to send reset email.');
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
        <h1 className="text-xl font-semibold text-[#1A1A1A]">Reset your password</h1>
        <p className="mt-2 text-sm text-slate-600">We will email you a secure link to choose a new password.</p>
        <label className="mt-6 block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
          placeholder="you@example.com"
          autoComplete="email"
        />
        {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting || !email.trim()}
          className="mt-6 w-full rounded-xl bg-[#C0392B] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
        <Link href="/auth" className="mt-4 block text-center text-sm font-semibold text-[#C0392B] hover:underline">
          Back to login
        </Link>
      </div>
    </main>
  );
}
