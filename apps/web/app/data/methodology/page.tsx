import type { Metadata } from 'next';
import Link from 'next/link';
import MarketingPageHero from '../../components/marketing/MarketingPageHero';

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
    <main>
      <MarketingPageHero
        eyebrow="Methodology"
        title={
          <>
            How we publish rental <em>market data</em>
          </>
        }
        lead="CRENIT Market Intelligence is designed for credibility: verified payments, explicit sample floors, and transparent freshness."
      />

      <section className="marketing-section">
        <div className="marketing-container max-w-3xl">
          <article className="marketing-panel">
            <div className="rc-prose">
              {sections.map((section) => (
                <section key={section.heading}>
                  <h2>{section.heading}</h2>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                  ))}
                </section>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap gap-3 border-t border-[var(--rc-border)] pt-8">
              <Link href="/data" className="marketing-btn-primary">
                Back to dashboard
              </Link>
              <Link href="/products/market-data" className="marketing-btn-outline">
                B2B sample key
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
