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
import MarketingAtmosphere from './components/marketing/MarketingAtmosphere';
import MarketingDataTable from './components/marketing/MarketingDataTable';
import HeroScoreCard from './components/marketing/HeroScoreCard';
import ProofStatsGrid from './components/marketing/ProofStatsGrid';
import MarketingLinkCard from './components/marketing/MarketingLinkCard';
import MarketingSectionReveal from './components/marketing/MarketingSectionReveal';
import MarketingTrustStrip from './components/marketing/MarketingTrustStrip';
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

const marketDataRows = [
  ['Khomasdal', 'N$8,200', '92%'],
  ['Pioneerspark', 'N$7,450', '94%'],
  ['Klein Windhoek', 'N$10,300', '96%'],
  ['Katutura', 'N$6,900', '91%'],
  ['Eros', 'N$11,100', '97%'],
] as const;

const testimonialBullets = [
  'Landlords see portfolio on-time rates by property',
  'Tenants download score reports for applications',
  'Developers license suburb feasibility packs',
] as const;

export default function Home() {
  return (
    <div className="marketing-page flex min-h-screen w-full flex-col">
      <MarketingHeader />
      <main className="w-full flex-1">
        <section className="border-b border-slate-200/60 dark:border-[var(--rc-border)]">
          <MarketingAtmosphere variant="hero">
            <div className="marketing-container py-14 sm:py-20 lg:py-24">
              <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
                <div>
                  <div className="marketing-accent-bar" />
                  <p className="marketing-eyebrow mt-6">Verified rental finance</p>
                  <h1 className="marketing-h1 mt-5">
                    Every on-time rent payment builds your <em>credit story</em>
                  </h1>
                  <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 dark:text-[var(--rc-text-secondary)]">
                    CRENIT turns real rent into rental credit scores and suburb-level market intelligence—so tenants get
                    fair access to finance and landlords, banks, and developers work from data they can trust.
                  </p>
                  <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Link href="/auth?mode=register" className="marketing-btn-primary text-center">
                      Create free account
                    </Link>
                    <Link
                      href="/company/how-it-works"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--rc-text)] transition hover:text-[#C0392B]"
                    >
                      See how it works
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                  <p className="mt-8 text-sm text-slate-500 dark:text-[var(--rc-text-muted)]">
                    For tenants, landlords, and partners licensing anonymised market data.
                  </p>
                </div>
                <div className="hero-float">
                  <HeroScoreCard />
                </div>
              </div>
            </div>
          </MarketingAtmosphere>
        </section>

        <section className="border-b border-slate-200/60 bg-white dark:bg-[var(--rc-card)]">
          <div className="marketing-container py-10 sm:py-12">
            <MarketingTrustStrip />
          </div>
        </section>

        <section className="border-b border-slate-200/60 bg-white dark:bg-[var(--rc-card)]">
          <div className="marketing-container py-14 sm:py-16">
            <MarketingSectionReveal>
              <div className="max-w-2xl">
                <p className="marketing-eyebrow">Why CRENIT</p>
                <h2 className="marketing-h2-display mt-4">
                  Built for accountable rental markets—not copied from abroad
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-600 dark:text-[var(--rc-text-secondary)]">
                  Most rental platforms stop at payments. CRENIT&apos;s commercial engine is{' '}
                  <strong className="font-semibold text-[var(--rc-text)]">monthly data recording</strong> and{' '}
                  <strong className="font-semibold text-[var(--rc-text)]">verified market intelligence</strong>.
                </p>
              </div>
            </MarketingSectionReveal>
            <MarketingSectionReveal delay={120}>
              <ProofStatsGrid />
            </MarketingSectionReveal>
          </div>
        </section>

        <section className="border-b border-slate-200/60">
          <div className="marketing-container py-14 sm:py-16">
            <MarketingSectionReveal>
              <p className="marketing-eyebrow">The flywheel</p>
              <h2 className="marketing-h2-display mt-4">Verified payments power the whole ecosystem</h2>
            </MarketingSectionReveal>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {flywheel.map((item, index) => (
                <MarketingSectionReveal key={item.step} delay={index * 70}>
                  <li className="marketing-flywheel-step h-full list-none">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C0392B]">{item.step}</span>
                    <p className="mt-3 text-sm font-medium leading-6 text-[var(--rc-text)]">{item.label}</p>
                  </li>
                </MarketingSectionReveal>
              ))}
            </ol>
          </div>
        </section>

        <section id="services" className="marketing-section">
          <div className="marketing-container">
            <MarketingSectionReveal>
              <p className="marketing-eyebrow">Platform</p>
              <h2 className="marketing-h2-display mt-4">One stack for rent, credit, and data</h2>
            </MarketingSectionReveal>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {platformCards.map((card, index) => (
                <MarketingSectionReveal key={card.title} delay={index * 60}>
                  <MarketingLinkCard
                    href={card.href}
                    title={card.title}
                    description={card.description}
                    icon={card.icon}
                    featured={card.featured}
                  />
                </MarketingSectionReveal>
              ))}
            </div>
          </div>
        </section>

        <section id="market-data" className="border-y border-slate-200/60 bg-white dark:bg-[var(--rc-card)]">
          <div className="marketing-container py-14 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
              <MarketingSectionReveal>
                <div>
                  <p className="marketing-eyebrow">Market intelligence</p>
                  <h2 className="marketing-h2-display mt-4">
                    Real rent data from real payments—not property listings
                  </h2>
                  <p className="mt-5 text-base leading-7 text-slate-600 dark:text-[var(--rc-text-secondary)]">
                    When a payment is confirmed on CRENIT, anonymised signals flow into suburb aggregates. Banks,
                    developers, and agents license reports with minimum sample rules—never tenant names or addresses.
                  </p>
                  <Link href="/products/market-data" className="marketing-btn-primary mt-8 inline-flex">
                    Request data access
                  </Link>
                </div>
              </MarketingSectionReveal>
              <MarketingSectionReveal delay={100}>
                <MarketingDataTable
                  columns={[
                    { key: 'suburb', header: 'Suburb' },
                    { key: 'avg', header: 'Avg 2BR' },
                    { key: 'ontime', header: 'On-time' },
                  ]}
                  rows={marketDataRows.map((row) => ({
                    key: row[0],
                    cells: [row[0], row[1], row[2]],
                  }))}
                  footer="Illustrative pilot aggregates · minimum sample rules apply in licensed reports"
                />
              </MarketingSectionReveal>
            </div>
          </div>
        </section>

        <section className="marketing-section">
          <div className="marketing-container">
            <MarketingSectionReveal>
              <div className="marketing-metal-card rounded-3xl p-8 sm:p-12 lg:grid lg:grid-cols-[1.2fr_0.8fr] lg:gap-12">
                <div>
                  <p className="marketing-eyebrow">From the field</p>
                  <blockquote className="marketing-pullquote mt-4">
                    &ldquo;We stopped guessing what Khomasdal rents should be. CRENIT gave us payment-backed numbers our
                    underwriters actually use.&rdquo;
                  </blockquote>
                  <footer className="mt-6">
                    <p className="font-semibold text-[var(--rc-text)]">Sarah M.</p>
                    <p className="text-sm text-slate-500 dark:text-[var(--rc-text-muted)]">
                      Credit analyst · Banking partner, Windhoek
                    </p>
                  </footer>
                </div>
                <div className="mt-8 flex flex-col justify-center gap-4 lg:mt-0">
                  {testimonialBullets.map((item) => (
                    <div key={item} className="marketing-check-row">
                      <span className="marketing-check-row__icon" aria-hidden>
                        ✓
                      </span>
                      <p className="text-sm leading-6 text-[var(--rc-text-secondary)]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </MarketingSectionReveal>
          </div>
        </section>

        <section id="get-started" className="border-t border-slate-200/60 bg-white pb-20 pt-14 dark:bg-[var(--rc-card)] sm:pb-24">
          <div className="marketing-container">
            <MarketingSectionReveal>
              <h2 className="marketing-h2-display text-center">Start with the role that fits you</h2>
            </MarketingSectionReveal>
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <MarketingSectionReveal delay={80}>
                <div className="marketing-metal-card h-full rounded-3xl p-8 sm:p-10">
                  <UserRound className="h-7 w-7 text-[#C0392B]" strokeWidth={1.5} />
                  <h3 className="mt-5 text-2xl font-semibold text-[var(--rc-text)]">I pay rent</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-[var(--rc-text-secondary)]">
                    Build a verified score from every on-time payment.
                  </p>
                  <Link href="/auth?mode=register" className="mt-8 marketing-btn-primary inline-flex">
                    Sign up as tenant
                  </Link>
                </div>
              </MarketingSectionReveal>
              <MarketingSectionReveal delay={160}>
                <div className="marketing-metal-card h-full rounded-3xl p-8 sm:p-10">
                  <Building2 className="h-7 w-7 text-[var(--rc-text)]" strokeWidth={1.5} />
                  <h3 className="mt-5 text-2xl font-semibold text-[var(--rc-text)]">I manage property</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-[var(--rc-text-secondary)]">
                    Onboard units and contribute payment-verified rent data.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href="/auth?mode=register" className="marketing-btn-primary">
                      Partner with CRENIT
                    </Link>
                    <Link href="/company/contact" className="marketing-btn-outline">
                      Contact sales
                    </Link>
                  </div>
                </div>
              </MarketingSectionReveal>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
