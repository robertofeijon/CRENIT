'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Building2,
  FileCheck2,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Wallet,
} from 'lucide-react';
import NumberCounter from '../src/components/NumberCounter';
import ForceRevealButton from '../src/components/ForceRevealButton';
import AuthModal from './components/auth/AuthModal';
import MarketingHeader from './components/marketing/MarketingHeader';
import MarketingFooter from './components/marketing/MarketingFooter';

const platformCards = [
  {
    icon: Wallet,
    title: 'Rent & receipts',
    description: 'Collect rent on-platform or record verified payments—with receipts tenants can use anywhere.',
    href: '/products/rent-payments',
  },
  {
    icon: TrendingUp,
    title: 'Rental credit score',
    description: 'A defensible 300–900 score built only from verified rent behaviour, not self-reported data.',
    href: '/products/credit-score',
  },
  {
    icon: ShieldCheck,
    title: 'KYC & identity',
    description: 'Rigorous onboarding so every record in the system is tied to a real person and property.',
    href: '/solutions/for-tenants',
  },
  {
    icon: FileCheck2,
    title: 'Deposit management',
    description: 'Track holds and releases with a clear audit trail for landlords and tenants.',
    href: '/products/deposit-management',
  },
  {
    icon: BarChart3,
    title: 'Market intelligence',
    description: 'Suburb-level rent and on-time rates from actual payments—not listings or estimates.',
    href: '/products/market-data',
    featured: true,
  },
];

const flywheel = [
  { step: '01', label: 'Verified landlords onboard properties' },
  { step: '02', label: 'Tenants pay rent through CRENIT' },
  { step: '03', label: 'Payments feed credit scores & aggregates' },
  { step: '04', label: 'Banks & developers license market data' },
];

const proofPoints = [
  { value: '100%', label: 'Transaction-sourced rent data' },
  { value: '5+', label: 'Min. records per suburb in reports' },
  { value: '0', label: 'PII in market intelligence exports' },
];

function ScoreGauge({ score }: { score: number }) {
  const ratio = useMemo(() => Math.max(0, Math.min(1, (score - 300) / 600)), [score]);

  const needle = useMemo(() => {
    const angle = Math.PI - ratio * Math.PI;
    const length = 64;
    return { x: 120 + Math.cos(angle) * length, y: 100 - Math.sin(angle) * length };
  }, [ratio]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-white/90 via-[#fff7f7]/90 to-[#fdecec]/95 p-5 shadow-[0_14px_28px_rgba(127,29,29,0.1)] backdrop-blur-sm">
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#f7c9c5]/55 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-12 left-6 h-24 w-24 rounded-full bg-white/60 blur-xl" aria-hidden />
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Rental credit score</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums text-[#7f1d1d]">{score}</p>
        </div>
        <span className="rounded-full border border-[#f1cfcc] bg-white/85 px-3 py-1 text-xs font-medium text-[#7f1d1d] shadow-sm">Good</span>
      </div>
      <svg viewBox="0 0 240 120" className="mt-3 h-[96px] w-full" aria-hidden>
        <path d="M20 100 A100 100 0 0 1 220 100" fill="none" stroke="#f1d7d5" strokeWidth="14" />
        <path
          d="M30 100 A90 90 0 0 1 210 100"
          fill="none"
          stroke="#C0392B"
          strokeWidth="10"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${Math.max(2, ratio * 100)} 100`}
        />
        <circle cx="120" cy="100" r="6" fill="#7f1d1d" />
        <line x1="120" y1="100" x2={needle.x} y2={needle.y} stroke="#7f1d1d" strokeWidth="4" strokeLinecap="round" />
        <circle cx={needle.x} cy={needle.y} r="3.5" fill="#C0392B" />
      </svg>
      <p className="mt-2 text-center text-xs text-slate-500">300 — 900 · Updated on verified payment</p>
    </div>
  );
}

export default function Home() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [score, setScore] = useState(742);

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  useEffect(() => {
    const start = performance.now();
    const durationMs = 900;
    const from = 300;
    const to = 742;
    let rafId = 0;

    setScore(from);

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 2);
      setScore(Math.round(from + (to - from) * eased));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="marketing-page flex min-h-screen w-full flex-col">
      <MarketingHeader onOpenAuth={openAuth} />
      <main className="w-full flex-1">
      {/* Hero — asymmetric, CRENIT voice */}
      <section className="border-b border-slate-200/60">
        <div className="marketing-container py-14 sm:py-20 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div>
              <div className="marketing-accent-bar" />
              <p className="marketing-eyebrow mt-6">Verified rental finance</p>
              <h1 className="marketing-h1 mt-5">
                Every on-time rent payment builds your <em>credit story</em>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                CRENIT turns real rent into rental credit scores and suburb-level market intelligence—so tenants get
                fair access to finance and landlords, banks, and developers work from data they can trust.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="button" onClick={() => openAuth('register')} className="marketing-btn-primary">
                  Create free account
                </button>
                <Link
                  href="/company/how-it-works"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#1A1A1A] hover:text-[#C0392B]"
                >
                  See how it works
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <p className="mt-8 text-sm text-slate-500">
                For tenants, landlords, and partners licensing anonymised market data.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/65 bg-gradient-to-br from-white/85 via-[#fff5f5]/90 to-[#fce8e7]/95 p-6 shadow-[0_24px_44px_rgba(127,29,29,0.14)] backdrop-blur-md sm:p-8">
              <div className="pointer-events-none absolute -right-16 -top-14 h-44 w-44 rounded-full bg-[#f3bbb6]/55 blur-3xl" aria-hidden />
              <div className="pointer-events-none absolute -left-10 bottom-8 h-32 w-32 rounded-full bg-white/70 blur-2xl" aria-hidden />
              <p className="text-xs font-medium uppercase tracking-widest text-[#7f1d1d]">Tenant dashboard</p>
              <p className="mt-3 text-xl font-medium leading-snug text-[#1A1A1A]">
                Payment history, score, and downloadable reports—in one place.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'Last payment', value: 'On time · Mar 2026' },
                  { label: 'Lease', value: 'Khomasdal · Active' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-white/75 bg-white/80 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-sm">
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="mt-1 text-sm font-medium text-[#1A1A1A]">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <ScoreGauge score={score} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What makes CRENIT different — not fake logos */}
      <section className="border-b border-slate-200/60 bg-white">
        <div className="marketing-container py-14 sm:py-16">
          <div className="max-w-2xl">
            <p className="marketing-eyebrow">Why CRENIT</p>
            <h2 className="marketing-h2 mt-4">Built for accountable rental markets—not copied from abroad</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Most rental platforms stop at payments. CRENIT&apos;s commercial engine is{' '}
              <strong className="font-semibold text-[#1A1A1A]">monthly data recording</strong> and{' '}
              <strong className="font-semibold text-[#1A1A1A]">verified market intelligence</strong>: landlords pay to
              keep payment history on record; tenants build credit from that verified trail.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {proofPoints.map((point) => (
              <div key={point.label} className="marketing-bento-card">
                <div className="marketing-stat-value text-[#C0392B]">
                  <NumberCounter value={point.value} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{point.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform — bento, not Esusu tabs */}
      <section id="services" className="marketing-section">
        <div className="marketing-container">
          <p className="marketing-eyebrow">Platform</p>
          <h2 className="marketing-h2 mt-4">One stack for rent, credit, and data</h2>
          <p className="mt-4 max-w-2xl text-slate-600">
            Each product feeds the same flywheel: better verification → better payments → better scores → better market
            data for lenders and partners.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {platformCards.map((card) => {
              const Icon = card.icon;
              return (
                  <Link
                    key={card.title}
                    href={card.href}
                    className={`marketing-bento-card group flex flex-col ${
                      card.featured ? 'border-[#C0392B]/30 bg-gradient-to-br from-[#FDEDEC] to-white lg:col-span-1' : ''
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        card.featured ? 'bg-[#C0392B] text-white' : 'bg-slate-100 text-[#1A1A1A]'
                      }`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold group-hover:text-[#C0392B]">{card.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{card.description}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#C0392B]">
                      Explore <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Flywheel — own story */}
      <section id="how-it-works" className="border-y border-slate-200/60 bg-white">
        <div className="marketing-container py-14 sm:py-20">
          <p className="marketing-eyebrow">The flywheel</p>
          <h2 className="marketing-h2 mt-4">How verified data compounds</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {flywheel.map((item, idx) => (
                <div key={item.step} className="marketing-flywheel-step">
                  <span className="text-xs font-bold tabular-nums text-[#C0392B]">{item.step}</span>
                  <p className="text-sm font-medium leading-6 text-[#1A1A1A]">{item.label}</p>
                  {idx < flywheel.length - 1 ? (
                    <span className="absolute -right-2 top-1/2 hidden h-px w-4 bg-slate-300 lg:block" aria-hidden />
                  ) : null}
                </div>
            ))}
          </div>
        </div>
      </section>

      {/* Market data — flagship differentiator */}
      <section id="market-data" className="border-y border-slate-200/60 bg-white text-[#1A1A1A]">
        <div className="marketing-container py-14 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C0392B]">Market intelligence</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-[#111827] sm:text-4xl">
                Real rent data from real payments—not property listings
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-600">
                When a payment is confirmed on CRENIT, anonymised signals flow into suburb aggregates. Banks, developers,
                and agents license reports with minimum sample rules—never tenant names or addresses.
              </p>
              <Link
                href="/products/market-data"
                className="marketing-btn-primary mt-8 inline-flex"
              >
                Request data access
              </Link>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#b4534d] bg-[#fff5f5] text-black shadow-[0_10px_24px_rgba(127,29,29,0.18)]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#7f1d1d] text-white">
                  <tr>
                    <th className="px-5 py-3.5 font-medium">Suburb</th>
                    <th className="px-5 py-3.5 font-medium">Avg 2BR</th>
                    <th className="px-5 py-3.5 font-medium">On-time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e9b4b0]">
                  {[
                    ['Khomasdal', 'N$8,200', '92%'],
                    ['Pioneerspark', 'N$7,450', '94%'],
                    ['Klein Windhoek', 'N$10,300', '96%'],
                    ['Katutura', 'N$6,900', '91%'],
                    ['Eros', 'N$11,100', '97%'],
                  ].map((row) => (
                    <tr key={row[0]} className="hover:bg-[#fde8e7]">
                      <td className="px-5 py-3.5 font-medium">{row[0]}</td>
                      <td className="px-5 py-3.5 text-black">{row[1]}</td>
                      <td className="px-5 py-3.5 text-black">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-[#e9b4b0] px-5 py-3 text-xs text-black/80">
                Illustrative demo figures · Live data requires partner access
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Single featured story — not Esusu outcome grid */}
      <section className="marketing-section">
        <div className="marketing-container">
          <div className="marketing-metal-card rounded-3xl p-8 sm:p-12 lg:grid lg:grid-cols-[1.2fr_0.8fr] lg:gap-12">
            <div>
              <p className="marketing-eyebrow">From the field</p>
              <blockquote className="mt-4 text-2xl font-medium leading-9 text-[#1A1A1A] sm:text-3xl">
                &ldquo;We stopped guessing what Khomasdal rents should be. CRENIT gave us payment-backed numbers our
                underwriters actually use.&rdquo;
              </blockquote>
              <footer className="mt-6">
                <p className="font-semibold">Sarah M.</p>
                <p className="text-sm text-slate-500">Credit analyst · Banking partner, Windhoek</p>
              </footer>
            </div>
            <div className="mt-8 flex flex-col justify-center gap-4 lg:mt-0">
              {[
                'Landlords see portfolio on-time rates by property',
                'Tenants download score reports for applications',
                'Developers license suburb feasibility packs',
              ].map((item) => (
                <div key={item} className="flex gap-3 rounded-xl bg-[#F3F4F6] px-4 py-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C0392B] text-xs text-white">
                    ✓
                  </span>
                  <p className="text-sm leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Get started */}
      <section id="get-started" className="border-t border-slate-200/60 bg-white pb-20 pt-14 sm:pb-24">
        <div className="marketing-container">
          <h2 className="marketing-h2 text-center">Start with the role that fits you</h2>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <div className="marketing-metal-card rounded-3xl p-8 text-[#1A1A1A] sm:p-10">
              <UserRound className="h-7 w-7 text-[#C0392B]" strokeWidth={1.5} />
              <h3 className="mt-5 text-2xl font-semibold">I pay rent</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Join when your landlord invites you—or register and link your lease. Build a verified score from every
                on-time payment.
              </p>
              <button type="button" onClick={() => openAuth('register')} className="mt-8 marketing-btn-primary">
                Sign up as tenant
              </button>
            </div>
            <div className="marketing-metal-card rounded-3xl p-8 sm:p-10">
              <Building2 className="h-7 w-7 text-[#1A1A1A]" strokeWidth={1.5} />
              <h3 className="mt-5 text-2xl font-semibold">I manage property</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Onboard units, invite tenants, and contribute payment-verified rent
                dataset.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button type="button" onClick={() => openAuth('register')} className="marketing-btn-primary">
                  Partner with CRENIT
                </button>
                <Link href="/company/contact" className="marketing-btn-outline">
                  Contact sales
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      </main>

      <MarketingFooter />
      <AuthModal open={authModalOpen} mode={authMode} onClose={() => setAuthModalOpen(false)} />
      {process.env.NODE_ENV === 'development' ? <ForceRevealButton /> : null}
    </div>
  );
}
