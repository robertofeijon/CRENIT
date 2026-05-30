"use client";

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';
import AuthModal from '../components/auth/AuthModal';

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, role: sessionRole, roleReady } = useAuth();
  const [modalOpen, setModalOpen] = useState(true);
  const mode = searchParams.get('mode') === 'register' ? 'register' : 'login';

  useEffect(() => {
    if (!user || !roleReady || !sessionRole) return;
    const role = sessionRole.toString().toUpperCase();
    if (role === 'ADMIN') router.replace('/admin');
    else if (role === 'LANDLORD') router.replace('/landlord/overview');
    else router.replace('/tenant/home');
  }, [user, sessionRole, roleReady, router]);

  return (
    <main className="min-h-screen bg-[#F3F4F6] px-4 py-8 text-[#1A1A1A] sm:px-8">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)] sm:p-10">
        <p className="text-xs uppercase tracking-[0.35em] text-[#C0392B]/90">CRENIT</p>
        <h1 className="mt-4 text-3xl font-semibold">Account access</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Sign in or create your account to continue to your dashboard.
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-[#C0392B] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-[#C0392B]/25 transition hover:bg-[#992d24]"
        >
          {mode === 'register' ? 'Open sign up' : 'Open login'}
        </button>
        <Link
          href="/"
          className="mt-4 inline-flex items-center justify-center rounded-full border border-[#1A1A1A] px-5 py-2 text-sm font-semibold transition hover:bg-slate-100"
        >
          Back to home
        </Link>
      </div>
      <AuthModal open={modalOpen} mode={mode} onClose={() => setModalOpen(false)} />
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F3F4F6] text-sm text-slate-600">
          Loading account access...
        </main>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
