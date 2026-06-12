import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
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
    <main className="min-h-[80vh] bg-[#F5F5F5] py-20">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <div className="mb-10 rounded-[2rem] bg-white p-10 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">{page.title}</p>
          <h1 className="mt-4 text-4xl font-semibold text-[#1A1A1A] sm:text-5xl">{page.headline}</h1>
          {legal?.lastUpdated ? (
            <p className="mt-3 text-sm text-slate-500">Last updated {legal.lastUpdated}</p>
          ) : null}
          {legal?.counselReview ? (
            <div
              className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950"
              role="note"
            >
              <p className="font-semibold text-amber-900">Draft — pending legal counsel review</p>
              <p className="mt-1 leading-6">
                This page is a product summary for staging. Do not treat it as final legal advice or a production
                sign-off. See our POPIA compliance backlog for counsel deliverables.
              </p>
            </div>
          ) : null}
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">{page.description}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {page.bullets.map((item) => (
              <div key={item} className="rounded-3xl border border-slate-200 bg-[#F8F8F8] p-5 text-sm text-slate-700">
                {item}
              </div>
            ))}
          </div>
          {legal?.sections?.length ? (
            <div className="prose prose-slate mt-12 max-w-none border-t border-slate-100 pt-10">
              {legal.sections.map((section) => (
                <section key={section.heading} className="mb-10">
                  <h2 className="text-xl font-semibold text-[#1A1A1A]">{section.heading}</h2>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)} className="mt-3 text-base leading-7 text-slate-600">
                      {paragraph}
                    </p>
                  ))}
                </section>
              ))}
              <p className="text-sm text-slate-500">
                Privacy questions:{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[#C0392B] hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
          ) : null}
          {isContact ? (
            <div className="mt-10 rounded-2xl border border-slate-200 bg-[#F8F8F8] p-6">
              <p className="text-sm font-semibold text-[#1A1A1A]">Email us</p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="mt-2 inline-block text-lg font-semibold text-[#C0392B] hover:underline">
                {CONTACT_EMAIL}
              </a>
              <p className="mt-4 text-sm text-slate-600">
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
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/auth" className="inline-flex items-center justify-center rounded-full bg-[#C0392B] px-6 py-3 text-sm font-semibold text-white hover:bg-[#992d24]">
              Get Started
            </Link>
            <Link href="/" className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-[#1A1A1A] hover:bg-slate-100">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
