import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart3, ShieldCheck, TrendingUp, Wallet } from 'lucide-react';
import MarketingCtaBand from '../components/marketing/MarketingCtaBand';
import MarketingLinkCard from '../components/marketing/MarketingLinkCard';
import MarketingPageHero from '../components/marketing/MarketingPageHero';
import { WINDHOEK_SUBURBS } from '../../src/lib/namibia-locale';

export const metadata: Metadata = {
  title: 'Products',
  description:
    'Rent payments, credit scoring, deposit management, and licensed rental market intelligence — one CRENIT platform.',
};

const products = [
  {
    title: 'Rent Payments',
    slug: 'rent-payments',
    description: 'Collect rent seamlessly, automate receipts, and track every payment in one verified ledger.',
    icon: Wallet,
  },
  {
    title: 'Credit Score',
    slug: 'credit-score',
    description: 'Convert on-time rental payments into a trusted credit history for tenants and lenders.',
    icon: TrendingUp,
  },
  {
    title: 'Deposit Management',
    slug: 'deposit-management',
    description: 'Securely manage tenant deposits from move-in to move-out with automated reconciliation.',
    icon: ShieldCheck,
  },
  {
    title: 'Data Intelligence',
    slug: 'market-data',
    description:
      'Licensed suburb rental comps for developers, estate agents, banks, and contractors — verified from real payments.',
    icon: BarChart3,
    featured: true,
  },
];

const workflowItems = [
  'Automated rent collection and receipts',
  'Verified credit reporting from rent history',
  'Secure deposit tracking and claims',
  'Localized market insights for underwriting',
];

export default function ProductsPage() {
  return (
    <main>
      <MarketingPageHero
        eyebrow="Products"
        title={
          <>
            One platform for rent, credit, deposits, and <em>market intelligence</em>
          </>
        }
        lead="CRENIT brings together the products landlords and tenants need to manage rental payments, build verified credit, and make smarter decisions with local market data."
      />

      <section className="marketing-section border-b border-slate-200/60 dark:border-[var(--rc-border)]">
        <div className="marketing-container">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {products.map((product) => (
              <MarketingLinkCard
                key={product.title}
                href={`/products/${product.slug}`}
                title={product.title}
                description={product.description}
                icon={product.icon}
                featured={product.featured}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section-muted border-b border-slate-200/60 dark:border-[var(--rc-border)]">
        <div className="marketing-container">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
            <div className="marketing-panel">
              <p className="marketing-eyebrow">How it works</p>
              <h2 className="marketing-h2-display mt-4">Streamlined rental workflows for every stakeholder</h2>
              <p className="mt-6 text-base leading-7 text-[var(--rc-text-secondary)]">
                From landlords collecting rent to tenants building credit and lenders underwriting rental borrowers,
                CRENIT connects the full rental lifecycle.
              </p>
              <div className="mt-8 space-y-3">
                {workflowItems.map((item) => (
                  <div key={item} className="marketing-check-row">
                    <span className="marketing-check-row__icon" aria-hidden>
                      ✓
                    </span>
                    <p className="text-sm leading-6 text-[var(--rc-text-secondary)]">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="marketing-spotlight">
              <p className="marketing-eyebrow text-[#f4a9a3]">Product focus</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">Trusted infrastructure for rental credit</h2>
              <p className="mt-5 text-base leading-7 text-slate-300">
                Build lasting tenant relationships, improve portfolio transparency, and give financial partners a new way
                to underwrite rentals.
              </p>
              <div className="mt-8 grid gap-4">
                <div className="marketing-spotlight__card">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Trusted data</p>
                  <p className="mt-3 text-lg font-semibold">Verified payments, verified performance.</p>
                </div>
                <div className="marketing-spotlight__card">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Reliable scores</p>
                  <p className="mt-3 text-lg font-semibold">Score improvements from real rental behaviour.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section border-b border-slate-200/60 dark:border-[var(--rc-border)]">
        <div className="marketing-container">
          <div className="marketing-accent-panel">
            <p className="marketing-eyebrow">Data Intelligence for property professionals</p>
            <h2 className="marketing-h2 mt-4">Know the rent range before you build, list, or lend</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--rc-text-secondary)]">
              CRENIT licenses anonymised, verified rental market data — suburb price bands, payment behaviour, and
              feasibility packs. Individual tenants are never exposed; only aggregates that meet minimum sample rules are
              licensed.
            </p>
            <Link href="/products/market-data" className="mt-6 inline-flex text-sm font-semibold text-[#C0392B] hover:underline">
              Explore market data →
            </Link>
            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rc-text-muted)]">
                Windhoek coverage (pilot suburbs)
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {WINDHOEK_SUBURBS.map((suburb) => (
                  <span key={suburb} className="marketing-chip">
                    {suburb}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketingCtaBand
        eyebrow="Get started"
        title={
          <>
            See how CRENIT can work for your <em>portfolio</em>
          </>
        }
        href="/auth?mode=register"
        ctaLabel="Create free account"
        secondaryHref="/company/contact"
        secondaryLabel="Contact sales"
      />
    </main>
  );
}
