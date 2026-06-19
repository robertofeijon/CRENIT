import { describe, expect, it } from 'vitest';
import { resolveLandlordTierFromManagedCount } from './lite-landlord.util';

describe('lite-landlord.util', () => {
  it('marks 1–3 units as LITE', () => {
    expect(resolveLandlordTierFromManagedCount(1)).toBe('LITE');
    expect(resolveLandlordTierFromManagedCount(3)).toBe('LITE');
  });

  it('marks 4+ units as FULL', () => {
    expect(resolveLandlordTierFromManagedCount(4)).toBe('FULL');
  });
});
