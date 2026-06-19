/** Web-facing copy for B2B demo suburbs (mirrors API constant). */
export const B2B_DEMO_DISCLAIMER =
  'Illustrative dataset — synthetic-but-plausible figures for sales conversations until verified platform volume supports these suburbs.';

export const B2B_WINDHOEK_DEMO_SUBURBS = [
  {
    suburb: 'Klein Windhoek',
    property_type: 'Apartment',
    bedrooms: 2,
    median_rent: 11_500,
    on_time_rate_pct: 88,
  },
  {
    suburb: 'Eros',
    property_type: 'House',
    bedrooms: 3,
    median_rent: 8_200,
    on_time_rate_pct: 82,
  },
  {
    suburb: 'Kleine Kuppe',
    property_type: 'Townhouse',
    bedrooms: 2,
    median_rent: 9_800,
    on_time_rate_pct: 85,
  },
] as const;
