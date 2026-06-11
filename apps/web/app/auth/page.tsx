"use client";

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';
import AuthModal from '../components/auth/AuthModal';
import Logo from '../components/ui/Logo';

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, role: sessionRole, roleReady } = useAuth();
  const mode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const [modalOpen, setModalOpen] = useState(true);

  useEffect(() => {
    setModalOpen(true);
  }, [mode]);

  useEffect(() => {
    if (!user || !roleReady || !sessionRole) return;
    const role = sessionRole.toString().toUpperCase();
    if (role === 'ADMIN') router.replace('/admin');
    else if (role === 'LANDLORD') router.replace('/landlord/overview');
    else router.replace('/tenant/home');
  }, [user, sessionRole, roleReady, router]);

  return (
    <main className="relative min-h-screen bg-[#F3F4F6] px-4 py-8 text-[#1A1A1A] sm:px-8">
      <div className="mx-auto flex max-w-3xl flex-col items-center pt-8">
        <Logo />
        <p className="mt-6 text-center text-sm text-slate-500">
          {mode === 'register' ? 'Create your CRENIT account' : 'Sign in to your CRENIT account'}
        </p>
        {!modalOpen ? (
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center justify-center rounded-full bg-[#C0392B] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-[#C0392B]/25 transition hover:bg-[#992d24]"
            >
              {mode === 'register' ? 'Open sign up' : 'Open login'}
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-[#1A1A1A] px-5 py-2 text-sm font-semibold transition hover:bg-slate-100"
            >
              Back to home
            </Link>
          </div>
        ) : (
          <Link
            href="/"
            className="mt-6 text-sm font-semibold text-slate-600 hover:text-[#C0392B]"
          >
            ← Back to home
          </Link>
        )}
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
