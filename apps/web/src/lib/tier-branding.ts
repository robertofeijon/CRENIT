export type BrandTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export type BrandTierDefinition = {
  id: BrandTier;
  label: string;
  minScore100: number;
  tagline: string;
  unlocks: string;
  nextTier: BrandTier | null;
};

export const BRAND_TIERS: BrandTierDefinition[] = [
  {
    id: 'PLATINUM',
    label: 'Platinum',
    minScore100: 80,
    tagline: 'Exceptional rental payment profile',
    unlocks: 'Strongest position for mortgage pre-qualification and premium rentals',
    nextTier: null,
  },
  {
    id: 'GOLD',
    label: 'Gold',
    minScore100: 65,
    tagline: 'Reliable payer with solid history',
    unlocks: 'Shareable reports carry high trust with landlords and lenders',
    nextTier: 'PLATINUM',
  },
  {
    id: 'SILVER',
    label: 'Silver',
    minScore100: 50,
    tagline: 'Building verified rental credit',
    unlocks: 'Eligible for standard rental applications with CRENIT verification',
    nextTier: 'GOLD',
  },
  {
    id: 'BRONZE',
    label: 'Bronze',
    minScore100: 0,
    tagline: 'Getting started on CRENIT',
    unlocks: 'Complete KYC and pay on time to move into Silver',
    nextTier: 'SILVER',
  },
];

export function brandTierFromScore100(score100: number): BrandTierDefinition {
  const sorted = [...BRAND_TIERS].sort((a, b) => b.minScore100 - a.minScore100);
  return sorted.find((t) => score100 >= t.minScore100) ?? BRAND_TIERS[BRAND_TIERS.length - 1];
}

export const BRAND_TIER_COLORS: Record<BrandTier, string> = {
  PLATINUM: 'text-violet-700 bg-violet-100',
  GOLD: 'text-amber-900 bg-amber-100',
  SILVER: 'text-slate-700 bg-slate-200',
  BRONZE: 'text-orange-900 bg-orange-100',
};
