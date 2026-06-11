export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  author: string;
  tags: string[];
  body: string[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'verified-rent-credit-namibia',
    title: 'Why verified rent credit matters in Namibia',
    excerpt:
      'Traditional credit bureaus rarely see rental behaviour. CRENIT records on-time rent as a first-class signal for tenants and lenders.',
    publishedAt: '2026-05-12',
    author: 'CRENIT Team',
    tags: ['Credit', 'Tenants'],
    body: [
      'Most tenants pay rent every month for years without that discipline appearing on a credit file. CRENIT closes that gap by tying scores to verified payments — not self-reported surveys.',
      'Landlords confirm EFT receipts or collect through the platform; each confirmed payment updates streak and on-time metrics tenants see on their dashboard.',
      'For lenders, a downloadable score report plus payment history PDF reduces guesswork when underwriting rental-backed borrowers.',
    ],
  },
  {
    slug: 'landlord-portfolio-on-time-rates',
    title: 'Portfolio on-time rates landlords actually use',
    excerpt:
      'Collection rate and suburb benchmarks help partners price units and spot risk before arrears compound.',
    publishedAt: '2026-05-28',
    author: 'CRENIT Team',
    tags: ['Landlords', 'Operations'],
    body: [
      'The landlord payments ledger shows expected vs collected rent, outstanding balances, and EFT proofs awaiting confirmation.',
      'When a tenant uploads proof, landlords review the document and mark received — triggering credit score updates automatically.',
      'Aggregated on-time behaviour (never tenant PII) feeds market intelligence products licensed to banks and developers.',
    ],
  },
  {
    slug: 'market-intelligence-pilot',
    title: 'Market intelligence: payment-sourced suburb comps',
    excerpt:
      'Rental comps from confirmed payments differ from listing sites — here is how CRENIT aggregates and licenses suburb data.',
    publishedAt: '2026-06-01',
    author: 'CRENIT Data',
    tags: ['Market data', 'B2B'],
    body: [
      'Each confirmed payment contributes anonymised signals: suburb, bedrooms, amount, and timeliness. Minimum sample rules prevent re-identification.',
      'Developers use feasibility packs; agents cite evidence-backed asking rents; banks stress-test income-to-rent using neighbourhood behaviour.',
      'Sale comps remain on the partner roadmap — rent intelligence ships today with API keys, webhooks, and admin dashboards.',
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
