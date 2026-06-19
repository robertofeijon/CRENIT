export type BankIntegrationOnePager = {
  slug: string;
  name: string;
  headline: string;
  bullets: string[];
  exportFormat: string;
  status: 'coming_soon';
};

/** Product one-pagers for early bank innovation conversations — integration not live yet. */
export const BANK_INTEGRATION_ONE_PAGERS: BankIntegrationOnePager[] = [
  {
    slug: 'fnb-namibia',
    name: 'FNB Namibia',
    headline: 'Verified rental payment signals for retail credit underwriting.',
    bullets: [
      'Monthly aggregate rent performance by suburb (no tenant PII)',
      'CRENIT score tier + on-time rate export for consenting tenants',
      'EFT reference alignment with FNB Namibia payment formats',
    ],
    exportFormat: 'Planned export: CSV batch + REST webhook for score tier updates.',
    status: 'coming_soon',
  },
  {
    slug: 'bank-windhoek',
    name: 'Bank Windhoek',
    headline: 'Rental-backed behavioural data for affordability and portfolio risk.',
    bullets: [
      'Suburb median rent and on-time payment rate for stress testing',
      'Dispute-free payment streaks as a supplementary signal',
      'POPIA-aligned consent trail for every shared data point',
    ],
    exportFormat: 'Planned export: signed JSON feed with freshness and confidence metadata.',
    status: 'coming_soon',
  },
  {
    slug: 'standard-bank-namibia',
    name: 'Standard Bank Namibia',
    headline: 'Bridge informal rental history into formal credit files.',
    bullets: [
      'Shareable tenant PDF with QR verification for branch workflows',
      'Market intelligence comps for mortgage and buy-to-let teams',
      'Minimum sample rules (n≥10 public, n≥5 B2B) baked into every export',
    ],
    exportFormat: 'Planned export: bureau-style flat file + API pull for enterprise.',
    status: 'coming_soon',
  },
];
