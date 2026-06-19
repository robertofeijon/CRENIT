import { describe, expect, it } from 'vitest';
import { B2B_WINDHOEK_DEMO_SUBURBS } from './b2b-demo-dataset.constant';
import { MIN_STATISTICAL_SUBURB_SAMPLE } from './market-intelligence.utils';

describe('b2b-demo-dataset', () => {
  it('defines three Windhoek suburbs with public-safe sample sizes', () => {
    expect(B2B_WINDHOEK_DEMO_SUBURBS).toHaveLength(3);
    for (const suburb of B2B_WINDHOEK_DEMO_SUBURBS) {
      expect(suburb.verified_rents.length).toBeGreaterThanOrEqual(MIN_STATISTICAL_SUBURB_SAMPLE);
      expect(suburb.city).toBe('Windhoek');
    }
  });
});
