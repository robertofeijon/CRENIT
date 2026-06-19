import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Market data methodology',
  description:
    'How CRENIT builds public rental market aggregates — sample rules, data sources, POPIA alignment, and refresh cadence.',
};

const sections = [
  {
    heading: 'Data sources',
    paragraphs: [
      'Primary signals come from verified rent payments on CRENIT — amounts, confirmation timestamps, and suburb metadata captured at payment time.',
      'Where live volume is insufficient, illustrative pilot snapshots may be flagged explicitly until real observations replace them.',
    ],
  },
  {
    heading: 'Privacy and suppression',
    paragraphs: [
      'Public dashboards require at least ten observations per suburb (n≥10). B2B API endpoints may surface suburbs from five observations (n≥5) with confidence labels.',
      'No tenant names, IDs, or lease references appear in licensed aggregates. Landlord identities are hashed before analytics storage.',
    ],
  },
  {
    heading: 'Refresh cadence',
    paragraphs: [
      'Payment capture runs continuously as landlords confirm rent. Suburb rollups refresh on a scheduled pipeline; the footer on every public data page shows the latest pipeline timestamp — never a hardcoded date.',
    ],
  },
  {
    heading: 'POPIA alignment',
    paragraphs: [
      'Tenants opt in to market data contribution via profile settings. Aggregates are statistical outputs, not personal information disclosures.',
      'For questions about data licensing or a data processing agreement, contact our team via the company contact page.',
    ],
  },
];

export default function MethodologyPage() {
  return (
    <main className="py-12">
      <div className="mx-auto max-w-3xl px-6 sm:px-8">
        <article className="rounded-[2rem] bg-white p-10 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">Methodology</p>
          <h1 className="mt-4 text-4xl font-semibold text-[#1A1A1A]">How we publish rental market data</h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            CRENIT Market Intelligence is designed for credibility: verified payments, explicit sample floors, and
            transparent freshness.
          </p>
          <div className="prose prose-slate mt-12 max-w-none">
            {sections.map((section) => (
              <section key={section.heading} className="mb-10">
                <h2 className="text-xl font-semibold text-[#1A1A1A]">{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 48)} className="mt-3 text-base leading-7 text-slate-600">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-4 border-t border-slate-100 pt-8">
            <Link
              href="/data"
              className="inline-flex items-center justify-center rounded-full bg-[#C0392B] px-6 py-3 text-sm font-semibold text-white hover:bg-[#992d24]"
            >
              Back to dashboard
            </Link>
            <Link
              href="/products/market-data"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold hover:bg-slate-50"
            >
              B2B sample key
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
