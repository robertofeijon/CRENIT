"use client";

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { useAuth } from '../../src/contexts/AuthContext';
import AuthModal from '../components/auth/AuthModal';
import MarketingAtmosphere from '../components/marketing/MarketingAtmosphere';
import Logo from '../components/ui/Logo';
import ThemeToggle from '../components/ui/ThemeToggle';

const authFeatures = [
  { icon: TrendingUp, label: 'Build credit from verified rent' },
  { icon: ShieldCheck, label: 'POPIA-aligned data controls' },
  { icon: Sparkles, label: 'Real-time score & portfolio updates' },
];

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
    <main className="relative min-h-screen text-[var(--rc-text)]">
      <MarketingAtmosphere variant="auth" className="min-h-screen px-4 py-8 sm:px-8">
        <div className="absolute right-4 top-4 z-10 sm:right-8">
          <ThemeToggle compact />
        </div>

        <div className="mx-auto grid max-w-5xl gap-10 pt-8 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16 lg:pt-16">
          <div className="text-center lg:text-left">
            <Logo size="md" />
            <p className="marketing-eyebrow mt-8">
              {mode === 'register' ? 'Join CRENIT' : 'Welcome back'}
            </p>
            <h1 className="marketing-h1 mt-4">
              {mode === 'register' ? (
                <>
                  Start building your <em>rental credit story</em>
                </>
              ) : (
                <>
                  Sign in to your <em>verified dashboard</em>
                </>
              )}
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-[var(--rc-text-secondary)] lg:mx-0 mx-auto">
              {mode === 'register'
                ? 'Tenants build scores from on-time rent. Landlords contribute payment-verified market data.'
                : 'Access your credit score, payments, and portfolio tools in one secure place.'}
            </p>

            <ul className="mt-8 space-y-3 text-left">
              {authFeatures.map(({ icon: Icon, label }) => (
                <li key={label} className="marketing-check-row">
                  <span className="marketing-check-row__icon flex items-center justify-center" aria-hidden>
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-medium text-[var(--rc-text)]">{label}</p>
                </li>
              ))}
            </ul>

            {!modalOpen ? (
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-start justify-center">
                <button type="button" onClick={() => setModalOpen(true)} className="marketing-btn-primary">
                  {mode === 'register' ? 'Open sign up' : 'Open login'}
                </button>
                <Link href="/" className="marketing-btn-outline text-center">
                  Back to home
                </Link>
              </div>
            ) : (
              <Link
                href="/"
                className="mt-8 inline-flex text-sm font-semibold text-[var(--rc-text-secondary)] transition hover:text-[#C0392B]"
              >
                ← Back to home
              </Link>
            )}
          </div>

          <div className="hidden lg:block">
            <div className="shimmer-border marketing-metal-card rounded-3xl p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C0392B]">Why verified rent matters</p>
              <p className="marketing-pullquote mt-4">
                &ldquo;Every confirmed payment becomes a data point lenders and landlords can actually trust.&rdquo;
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  { label: 'Score range', value: '300–900' },
                  { label: 'Coverage', value: 'Windhoek pilot' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-[var(--rc-border)] bg-[var(--rc-card-alt)] p-4">
                    <p className="text-xs text-[var(--rc-text-muted)]">{item.label}</p>
                    <p className="mt-1 font-semibold text-[var(--rc-text)]">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <AuthModal open={modalOpen} mode={mode} onClose={() => setModalOpen(false)} />
      </MarketingAtmosphere>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main className="marketing-page flex min-h-screen items-center justify-center text-sm text-[var(--rc-text-secondary)]">
          Loading account access...
        </main>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
