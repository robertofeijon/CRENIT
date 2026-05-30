import { MIN_STATISTICAL_SUBURB_SAMPLE, MIN_SUBURB_SAMPLE } from './market-intelligence.utils';

/** Commercial positioning for CRENIT Data Intelligence — B2B property market data. */
export const DATA_INTELLIGENCE_METHODOLOGY = {
  data_domain: 'verified_rental' as const,
  headline:
    'Anonymised, consent-based rental intelligence derived from confirmed platform payments — not listings, estimates, or sale deeds.',
  principles: [
    'Individual tenants and landlords are never identified in products or API responses.',
    'Only aggregated statistics are licensed; minimum sample rules apply before a suburb is sold.',
    'Records reflect actual paid rent and payment behaviour (on-time, late, days to pay).',
    'Sale / transfer prices are not included today; use rental comps for yield and feasibility, not deed values.',
  ],
  sample_thresholds: {
    explorer_minimum: MIN_SUBURB_SAMPLE,
    statistical_minimum: MIN_STATISTICAL_SUBURB_SAMPLE,
    high_confidence: 25,
  },
};

export const BUYER_PERSONAS = [
  {
    id: 'developer',
    label: 'Developers & builders',
    use: 'Feasibility rent assumptions, unit mix, and area demand before breaking ground.',
  },
  {
    id: 'estate_agent',
    label: 'Estate agents & valuers',
    use: 'Evidence-backed asking rent ranges and suburb comparisons for landlords and investors.',
  },
  {
    id: 'bank',
    label: 'Banks & lenders',
    use: 'Neighbourhood payment behaviour and income-to-rent stress for rental-backed credit.',
  },
  {
    id: 'contractor',
    label: 'Contractors & PM firms',
    use: 'Benchmark service charges and portfolio performance by suburb.',
  },
  {
    id: 'government',
    label: 'Government & research',
    use: 'Policy-grade aggregates on rental affordability and payment reliability.',
  },
  {
    id: 'investor',
    label: 'Investors',
    use: 'Compare suburbs for yield potential using verified median rent and occupancy signals.',
  },
];

export const REPORT_PRODUCT_CATALOG: Record<
  string,
  {
    display_name: string;
    description: string;
    target_audiences: string[];
    use_cases: string[];
    deliverables: string[];
    requires_suburb: boolean;
    suggested_price_nad: number;
  }
> = {
  suburb_report: {
    display_name: 'Suburb Rental Intelligence Report',
    description:
      'Licensed PDF + structured data for one suburb: verified rent bands, bedroom splits, on-time payment trends, and income-to-rent distribution.',
    target_audiences: ['Estate Agent', 'Developer', 'Research Firm'],
    use_cases: [
      'Set asking rent for a new listing',
      'Compare a property against suburb median',
      'Client pitch with verified local benchmarks',
    ],
    deliverables: ['PDF report', 'Rent histogram', '12-month on-time trend', 'Bedroom breakdown'],
    requires_suburb: true,
    suggested_price_nad: 2500,
  },
  city_overview: {
    display_name: 'Windhoek City Rental Overview',
    description:
      'Portfolio-wide suburb ranking — where rents are rising, which areas have the strongest payment discipline, and volume by neighbourhood.',
    target_audiences: ['Bank', 'Government', 'Developer'],
    use_cases: [
      'Market entry strategy across suburbs',
      'Portfolio allocation for institutional landlords',
      'Macro rental market briefing',
    ],
    deliverables: ['Multi-suburb comparison', 'City-wide aggregates', 'Trend summary'],
    requires_suburb: false,
    suggested_price_nad: 8500,
  },
  lender_risk_pack: {
    display_name: 'Lender Rental Risk Pack',
    description:
      'Underwriting-focused suburb pack: on-time payment rates, late-payment incidence, and income band distribution for rental-backed facilities.',
    target_audiences: ['Bank', 'Government'],
    use_cases: [
      'Collateral rental stress testing',
      'Neighbourhood risk tiering for buy-to-let',
      'Regulatory or portfolio reporting',
    ],
    deliverables: ['On-time rate series', 'Income-to-rent bands', 'Sample disclosure'],
    requires_suburb: true,
    suggested_price_nad: 4200,
  },
  development_feasibility: {
    display_name: 'Development Feasibility Pack',
    description:
      'Target-suburb pack for new builds: verified rent range, 12-month direction, bedroom mix returns, and payment reliability for absorption modelling.',
    target_audiences: ['Developer', 'Research Firm'],
    use_cases: [
      'Pro forma rent assumptions',
      'Unit mix (1BR / 2BR / 3BR) revenue modelling',
      'Investor memorandum data appendix',
    ],
    deliverables: ['Rent range & trend', 'Bedroom yield comparison', 'Feasibility narrative data'],
    requires_suburb: true,
    suggested_price_nad: 5500,
  },
};

export function confidenceFromSampleCount(count: number): 'high' | 'moderate' | 'low' | 'insufficient' {
  if (count >= DATA_INTELLIGENCE_METHODOLOGY.sample_thresholds.high_confidence) return 'high';
  if (count >= DATA_INTELLIGENCE_METHODOLOGY.sample_thresholds.statistical_minimum) return 'moderate';
  if (count >= DATA_INTELLIGENCE_METHODOLOGY.sample_thresholds.explorer_minimum) return 'low';
  return 'insufficient';
}

export function recommendedUseCases(count: number, onTimeRate: number): string[] {
  const uses: string[] = [];
  if (count >= MIN_SUBURB_SAMPLE) {
    uses.push('rent_pricing', 'suburb_comparison');
  }
  if (count >= MIN_STATISTICAL_SUBURB_SAMPLE) {
    uses.push('feasibility_modelling', 'lender_rental_stress');
  }
  if (count >= 25) {
    uses.push('institutional_reporting', 'api_integration');
  }
  if (onTimeRate >= 85) {
    uses.push('low_risk_collateral_marketing');
  }
  return uses;
}

/** Roadmap: transfer/sale price comps via certified partners — separate from verified rental pipeline. */
export const SALE_COMPS_ROADMAP = {
  status: 'planned' as const,
  data_domain: 'verified_sale' as const,
  title: 'Sale comps (planned)',
  summary:
    'Suburb-level sale price bands, transfer volumes, and $/m² benchmarks for developers pricing stock, agents listing for sale, and banks on mortgage collateral — sourced via partner feeds, not CRENIT rent payments.',
  target_window: 'Partner pilot — contact admin to register interest',
  differentiation_from_rental:
    'Rental comps (live today) reflect paid rent on CRENIT. Sale comps will be a separate licensed layer so clients never confuse deed values with asking rent.',
  partner_integration: {
    headline: 'Partner integration path',
    description:
      'CRENIT will not scrape portals or guess sale prices. Aggregated sale statistics will enter through vetted partners, then ship on the same API and report rails as rental intelligence.',
    partner_types: [
      {
        id: 'deeds_registry',
        label: 'Deeds & title registry',
        role: 'Anonymised transfer price and date feeds by suburb / erf (where legally shareable).',
      },
      {
        id: 'valuer_network',
        label: 'Registered valuers & estate groups',
        role: 'Closed sale confirmations and valuation range submissions with audit trail.',
      },
      {
        id: 'developer_mls',
        label: 'Developer / MLS partners',
        role: 'Bulk settlement data from new-build sales and sectional title transfers.',
      },
      {
        id: 'bank_collateral',
        label: 'Bank collateral desks',
        role: 'Aggregated mortgage security values for suburb stress testing (no borrower PII).',
      },
    ],
    integration_steps: [
      'Execute data-sharing agreement and suburb aggregation rules (minimum sample, no unit-level PII in API).',
      'Map partner schema → CRENIT `market_intelligence.sale_comps_records` (migration + ingest job).',
      'QA overlap with rental comps — dual-domain suburb explorer (rent tab | sale tab).',
      'Launch B2B products: Sale Suburb Pack, Sale vs Rent Yield Pack, combined API fields.',
    ],
    technical_placeholder: {
      ingest_endpoint: 'POST /admin/data-intelligence/partners/{partnerId}/sale-ingest (planned)',
      public_api: 'GET /api/v1/suburb/{name}/sale-comps (planned)',
      storage_table: 'market_intelligence.sale_comps_records (planned)',
    },
  },
  planned_products: [
    {
      report_type: 'sale_suburb_pack',
      display_name: 'Sale Suburb Pack (planned)',
      description: 'Median sale price, price per m² band, and 12-month transfer volume for one suburb.',
      target_audiences: ['Estate Agent', 'Developer', 'Bank'],
      suggested_price_nad: 3200,
    },
    {
      report_type: 'sale_rent_yield_pack',
      display_name: 'Sale vs Rent Yield Pack (planned)',
      description: 'Side-by-side verified rent and partner sale comps for gross yield and investor memos.',
      target_audiences: ['Investor', 'Developer', 'Bank'],
      suggested_price_nad: 4800,
    },
  ],
  admin_actions: [
    'Register a partner prospect in B2B clients with type Government, Bank, or Estate Agent.',
    'Track pilot suburb and legal review before enabling ingest.',
    'Do not quote sale figures to clients until status moves from planned → pilot.',
  ],
};

export function licensingNotice(confidence: string): string {
  if (confidence === 'insufficient') {
    return 'Below minimum sample — not for external commercial use until more verified records are captured.';
  }
  if (confidence === 'low') {
    return 'Directional only — suitable for internal screening; cite sample size in client deliverables.';
  }
  if (confidence === 'moderate') {
    return 'Suitable for licensed reports and client advice with sample disclosure.';
  }
  return 'Suitable for licensed B2B products, API distribution, and investor-grade appendices.';
}
