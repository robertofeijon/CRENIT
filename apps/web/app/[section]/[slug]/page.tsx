import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import MarketingPageHero from '../../components/marketing/MarketingPageHero';
import MarketingSectionReveal from '../../components/marketing/MarketingSectionReveal';
import SlugFeatureGrid from '../../components/marketing/SlugFeatureGrid';
import TenantWaitlistForm from '../../components/marketing/TenantWaitlistForm';
import BankIntegrationCards from '../../components/marketing/BankIntegrationCards';
import { LEGAL_PAGES } from '../../../src/content/legal-pages';
import { CONTACT_EMAIL, MARKETING_SLUGS } from '../../../src/lib/site';

const pageData: Record<string, { title: string; headline: string; description: string; bullets: string[] }> = {
  'products/rent-payments': {
    title: 'Rent Payments',
    headline: 'Simplify rent collection with transparent payments.',
    description:
      'Automate rent reconciliation, provide tenants with digital receipts, and turn every verified payment into reusable portfolio performance data.',
    bullets: ['Online rent tracking', 'Verified payment history', 'Automated landlord reporting'],
  },
  'products/credit-score': {
    title: 'Credit Score',
    headline: 'Build verified credit history from rental behavior.',
    description:
      'Help tenants convert on-time rent payments into trusted credit data while landlords get insight into renter creditworthiness.',
    bullets: ['Real-time scoring', 'Rental payment reporting', 'Lender-friendly insights'],
  },
  'products/deposit-management': {
    title: 'Deposit Management',
    headline: 'Securely manage tenant deposits from move-in to move-out.',
    description:
      'Keep funds secure, track deposit claims, and build trust with transparent deposit handling for both tenants and landlords.',
    bullets: ['Secure deposit holding', 'Claim tracking', 'Automated reconciliation'],
  },
  'products/market-data': {
    title: 'Market Data',
    headline: 'Unlock verified rent and occupancy insights by market.',
    description:
      'Use our unique rent dataset to make smarter pricing, underwriting, and portfolio decisions backed by real tenant payments.',
    bullets: ['Verified rent metrics', 'Local market trends', 'Data-driven decisions'],
  },
  'solutions/for-tenants': {
    title: 'For Tenants',
    headline: 'Turn every payment into a stronger financial profile.',
    description:
      'Build credit, prove rental reliability, and access better housing and lending options using your rent payment history.',
    bullets: ['Credit-building renter profile', 'Digital payment records', 'Faster approvals'],
  },
  'solutions/for-landlords': {
    title: 'For Landlords',
    headline: 'Manage your portfolio with confidence.',
    description:
      'Streamline operations, reduce risk, and offer tenants a value-added experience with verified rent reporting and portfolio insights.',
    bullets: ['Tenant onboarding', 'Payment verification', 'Performance dashboards'],
  },
  'solutions/for-banks-lenders': {
    title: 'For Banks & Lenders',
    headline: 'Access rental-backed credit signals for better underwriting.',
    description:
      'Leverage our verified rent data to underwrite more accurately and expand lending to underserved rental customers.',
    bullets: ['Verified rental data', 'Credit decision support', 'Risk-adjusted lending'],
  },
  'solutions/for-developers': {
    title: 'For Developers',
    headline: 'Build better rental communities with data-driven leasing.',
    description:
      'Use CRENIT insights to set pricing, attract long-term tenants, and position new developments for financial success.',
    bullets: ['Market intelligence', 'Tenant credit visibility', 'Demand forecasting'],
  },
  'company/about-us': {
    title: 'About Us',
    headline: 'CRENIT is building a new rental credit economy.',
    description:
      'We help landlords, tenants, and financial partners turn rent payments into verified financial identity through trusted technology and local market expertise.',
    bullets: ['Mission-driven fintech', 'Payment-verified rental data', 'Trusted rental partners'],
  },
  'company/how-it-works': {
    title: 'How It Works',
    headline: 'A seamless experience for payments, scoring, and reporting.',
    description:
      'CRENIT connects landlords, tenants, and lenders through verified rental payment flows, transparent score updates, and actionable market data.',
    bullets: ['Tenant rent verification', 'Landlord dashboard', 'Credit reporting'],
  },
  'company/contact': {
    title: 'Contact',
    headline: 'Get in touch with the CRENIT team.',
    description:
      "We're here to answer questions from landlords, tenants, and financial partners. Reach out for onboarding support or partnership inquiries.",
    bullets: ['Sales inquiries', 'Partner support', 'General questions'],
  },
};

export function generateStaticParams() {
  return MARKETING_SLUGS.map((slug) => {
    const [section, ...rest] = slug.split('/');
    return { section, slug: rest.join('/') };
  });
}

function resolvePage(key: string) {
  return LEGAL_PAGES[key] ?? pageData[key];
}

export function generateMetadata({ params }: { params: { section: string; slug: string } }): Metadata {
  const key = `${params.section}/${params.slug}`;
  const page = resolvePage(key);
  if (!page) return { title: 'Not found' };
  return {
    title: page.title,
    description: page.description,
    openGraph: { title: page.headline, description: page.description },
  };
}

export default function SectionPage({ params }: { params: { section: string; slug: string } }) {
  const key = `${params.section}/${params.slug}`;
  const page = resolvePage(key);

  if (!page) {
    notFound();
  }

  const isContact = key === 'company/contact';
  const legal = LEGAL_PAGES[key];

  return (
    <main>
      <MarketingPageHero eyebrow={page.title} title={page.headline} lead={page.description} />

      <section className="marketing-section">
        <div className="marketing-container max-w-4xl">
          <MarketingSectionReveal>
            <article className="marketing-panel">
              {legal?.lastUpdated ? (
                <p className="mb-6 text-sm text-[var(--rc-text-muted)]">Last updated {legal.lastUpdated}</p>
              ) : null}
              {legal?.counselReview ? (
                <div className="marketing-callout marketing-callout--legal mb-8" role="note">
                  <p className="font-semibold text-amber-900 dark:text-amber-100">Draft — pending legal counsel review</p>
                  <p className="mt-1 leading-6">
                    Packet version {legal.counselReviewVersion || 'draft'} — not final legal advice or production
                    sign-off. See <code>docs/legal/COUNSEL_REVIEW_PACKET.md</code>.
                  </p>
                </div>
              ) : null}

              <SlugFeatureGrid bullets={page.bullets} pageKey={key} />

            {legal?.sections?.length ? (
              <div className="rc-prose mt-12 border-t border-[var(--rc-border)] pt-10">
                {legal.sections.map((section) => (
                  <section key={section.heading}>
                    <h2>{section.heading}</h2>
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                    ))}
                  </section>
                ))}
                <p className="text-sm text-[var(--rc-text-muted)]">
                  Privacy questions:{' '}
                  <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                </p>
              </div>
            ) : null}

            {key === 'solutions/for-tenants' ? (
              <div className="mt-10 border-t border-[var(--rc-border)] pt-10">
                <TenantWaitlistForm />
              </div>
            ) : null}

            {key === 'solutions/for-banks-lenders' ? (
              <div className="mt-10 border-t border-[var(--rc-border)] pt-10">
                <p className="marketing-eyebrow">Integration targets</p>
                <div className="mt-6">
                  <BankIntegrationCards />
                </div>
              </div>
            ) : null}

            {isContact ? (
              <div className="mt-10 rounded-2xl border border-[var(--rc-border)] bg-[var(--rc-card-alt)] p-6">
                <p className="text-sm font-semibold text-[var(--rc-text)]">Email us</p>
                <a href={`mailto:${CONTACT_EMAIL}`} className="mt-2 inline-block text-lg font-semibold text-[#C0392B] hover:underline">
                  {CONTACT_EMAIL}
                </a>
                <p className="mt-4 text-sm text-[var(--rc-text-secondary)]">
                  For account access, use{' '}
                  <Link href="/auth" className="font-semibold text-[#C0392B] hover:underline">
                    sign in
                  </Link>{' '}
                  or{' '}
                  <Link href="/auth?mode=register" className="font-semibold text-[#C0392B] hover:underline">
                    create an account
                  </Link>
                  .
                </p>
              </div>
            ) : null}

            <div className="mt-10 flex flex-wrap gap-3 border-t border-[var(--rc-border)] pt-8">
              <Link href="/auth" className="marketing-btn-primary">
                Get started
              </Link>
              <Link href="/" className="marketing-btn-outline">
                Back to home
              </Link>
            </div>
          </article>
          </MarketingSectionReveal>
        </div>
      </section>
    </main>
  );
}
