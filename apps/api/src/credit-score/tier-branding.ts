/** Presentation tiers (Phase 1) — internal score math unchanged */

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

export function nextBrandTier(current: BrandTier): BrandTierDefinition | null {
  const def = BRAND_TIERS.find((t) => t.id === current);
  if (!def?.nextTier) return null;
  return BRAND_TIERS.find((t) => t.id === def.nextTier) ?? null;
}

export function brandTierProgress(score100: number) {
  const current = brandTierFromScore100(score100);
  const next = nextBrandTier(current.id);
  if (!next) {
    return { current, next: null, pointsToNext: 0, progressPct: 100 };
  }
  const pointsToNext = Math.max(0, Math.round((next.minScore100 - score100) * 10) / 10);
  const range = next.minScore100 - current.minScore100;
  const progressPct = range > 0 ? Math.min(100, Math.round(((score100 - current.minScore100) / range) * 100)) : 0;
  return { current, next, pointsToNext, progressPct };
}
