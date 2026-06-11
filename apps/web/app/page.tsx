import type { Metadata } from 'next';
import Link from 'next/link';
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
import MarketingHeader from './components/marketing/MarketingHeader';
import MarketingFooter from './components/marketing/MarketingFooter';
import HeroScoreCard from './components/marketing/HeroScoreCard';
import ProofStatsGrid from './components/marketing/ProofStatsGrid';
import { SITE_DESCRIPTION, SITE_NAME } from '../src/lib/site';

export const metadata: Metadata = {
  title: `${SITE_NAME} — Verified rent credit & market intelligence`,
  description: SITE_DESCRIPTION,
};

const platformCards = [
  { icon: Wallet, title: 'Rent & receipts', description: 'Collect rent on-platform or record verified payments—with receipts tenants can use anywhere.', href: '/products/rent-payments' },
  { icon: TrendingUp, title: 'Rental credit score', description: 'A defensible 300–900 score built only from verified rent behaviour, not self-reported data.', href: '/products/credit-score' },
  { icon: ShieldCheck, title: 'KYC & identity', description: 'Rigorous onboarding so every record in the system is tied to a real person and property.', href: '/solutions/for-tenants' },
  { icon: FileCheck2, title: 'Deposit management', description: 'Track holds and releases with a clear audit trail for landlords and tenants.', href: '/products/deposit-management' },
  { icon: BarChart3, title: 'Market intelligence', description: 'Suburb-level rent and on-time rates from actual payments—not listings or estimates.', href: '/products/market-data', featured: true },
];

const flywheel = [
  { step: '01', label: 'Verified landlords onboard properties' },
  { step: '02', label: 'Tenants pay rent through CRENIT' },
  { step: '03', label: 'Payments feed credit scores & aggregates' },
  { step: '04', label: 'Banks & developers license market data' },
];

export default function Home() {
  return (
    <div className="marketing-page flex min-h-screen w-full flex-col">
      <MarketingHeader />
      <main className="w-full flex-1">
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
                  <Link href="/auth?mode=register" className="marketing-btn-primary text-center">
                    Create free account
                  </Link>
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
              <HeroScoreCard />
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200/60 bg-white">
          <div className="marketing-container py-14 sm:py-16">
            <div className="max-w-2xl">
              <p className="marketing-eyebrow">Why CRENIT</p>
              <h2 className="marketing-h2 mt-4">Built for accountable rental markets—not copied from abroad</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Most rental platforms stop at payments. CRENIT&apos;s commercial engine is{' '}
                <strong className="font-semibold text-[#1A1A1A]">monthly data recording</strong> and{' '}
                <strong className="font-semibold text-[#1A1A1A]">verified market intelligence</strong>.
              </p>
            </div>
            <ProofStatsGrid />
          </div>
        </section>

        <section className="border-b border-slate-200/60">
          <div className="marketing-container py-14 sm:py-16">
            <p className="marketing-eyebrow">The flywheel</p>
            <h2 className="marketing-h2 mt-4">Verified payments power the whole ecosystem</h2>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {flywheel.map((item) => (
                <li key={item.step} className="marketing-bento-card">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C0392B]">{item.step}</span>
                  <p className="mt-3 text-sm font-medium leading-6 text-[#1A1A1A]">{item.label}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="services" className="marketing-section">
          <div className="marketing-container">
            <p className="marketing-eyebrow">Platform</p>
            <h2 className="marketing-h2 mt-4">One stack for rent, credit, and data</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {platformCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.title}
                    href={card.href}
                    className={`marketing-bento-card group flex flex-col ${card.featured ? 'border-[#C0392B]/30 bg-gradient-to-br from-[#FDEDEC] to-white' : ''}`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.featured ? 'bg-[#C0392B] text-white' : 'bg-slate-100 text-[#1A1A1A]'}`}>
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

        <section id="get-started" className="border-t border-slate-200/60 bg-white pb-20 pt-14 sm:pb-24">
          <div className="marketing-container">
            <h2 className="marketing-h2 text-center">Start with the role that fits you</h2>
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <div className="marketing-metal-card rounded-3xl p-8 text-[#1A1A1A] sm:p-10">
                <UserRound className="h-7 w-7 text-[#C0392B]" strokeWidth={1.5} />
                <h3 className="mt-5 text-2xl font-semibold">I pay rent</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">Build a verified score from every on-time payment.</p>
                <Link href="/auth?mode=register" className="mt-8 marketing-btn-primary inline-flex">
                  Sign up as tenant
                </Link>
              </div>
              <div className="marketing-metal-card rounded-3xl p-8 sm:p-10">
                <Building2 className="h-7 w-7 text-[#1A1A1A]" strokeWidth={1.5} />
                <h3 className="mt-5 text-2xl font-semibold">I manage property</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">Onboard units and contribute payment-verified rent data.</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/auth?mode=register" className="marketing-btn-primary">
                    Partner with CRENIT
                  </Link>
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
    </div>
  );
}
