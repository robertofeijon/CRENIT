/** Synthetic-but-plausible Windhoek pilot suburbs for B2B sales demos until live volume supports them. */
export const B2B_DEMO_CLIENT_NAME = 'CRENIT B2B Demo (Illustrative)';

export type B2bDemoSuburbSpec = {
  suburb: string;
  city: string;
  property_type: string;
  bedrooms: number;
  median_rent: number;
  on_time_rate_pct: number;
  avg_days_to_pay: number;
  /** Individual verified rent amounts (n ≥ 10 for public MI suppression). */
  verified_rents: number[];
};

export const B2B_WINDHOEK_DEMO_SUBURBS: B2bDemoSuburbSpec[] = [
  {
    suburb: 'Klein Windhoek',
    city: 'Windhoek',
    property_type: 'Apartment',
    bedrooms: 2,
    median_rent: 11_500,
    on_time_rate_pct: 88,
    avg_days_to_pay: 0.8,
    verified_rents: [9_800, 10_200, 10_800, 11_200, 11_500, 11_800, 12_000, 12_500, 10_900, 11_400, 11_600, 12_100],
  },
  {
    suburb: 'Eros',
    city: 'Windhoek',
    property_type: 'House',
    bedrooms: 3,
    median_rent: 8_200,
    on_time_rate_pct: 82,
    avg_days_to_pay: 1.4,
    verified_rents: [6_900, 7_400, 7_800, 8_000, 8_200, 8_500, 8_900, 9_100, 7_600, 8_300, 8_600, 8_950],
  },
  {
    suburb: 'Kleine Kuppe',
    city: 'Windhoek',
    property_type: 'Townhouse',
    bedrooms: 2,
    median_rent: 9_800,
    on_time_rate_pct: 85,
    avg_days_to_pay: 1.1,
    verified_rents: [8_400, 8_900, 9_200, 9_500, 9_800, 10_100, 10_400, 10_700, 9_000, 9_600, 10_000, 10_250],
  },
];

export const B2B_DEMO_DISCLAIMER =
  'Illustrative dataset — synthetic-but-plausible figures for sales conversations until verified platform volume supports these suburbs.';
