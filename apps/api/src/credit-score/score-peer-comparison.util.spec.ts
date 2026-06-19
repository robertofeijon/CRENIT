import { describe, expect, it } from 'vitest';
import {
  aggregatePeerRatesFromMarketRecords,
  buildPeerComparisonMessage,
  percentileBetterThanPeers,
  shouldSuppressPeerComparison,
} from './score-peer-comparison.util';

describe('score-peer-comparison.util', () => {
  it('suppresses when sample below MIN_SUBURB_SAMPLE (5)', () => {
    expect(shouldSuppressPeerComparison(4)).toBe(true);
    expect(shouldSuppressPeerComparison(5)).toBe(false);
  });

  it('computes percentile better than peers', () => {
    expect(percentileBetterThanPeers(100, [80, 90, 70, 60])).toBe(100);
    expect(percentileBetterThanPeers(50, [80, 90, 70, 60])).toBe(0);
    expect(percentileBetterThanPeers(75, [80, 90, 70, 60])).toBe(50);
  });

  it('aggregates market records by tenant hash', () => {
    const rows = aggregatePeerRatesFromMarketRecords(
      [
        { tenant_hash: 'a', payment_status: 'on_time', suburb: 'Klein Windhoek' },
        { tenant_hash: 'a', payment_status: 'late', suburb: 'Klein Windhoek' },
        { tenant_hash: 'b', payment_status: 'on_time', suburb: 'Klein Windhoek' },
      ],
      () => true,
    );
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.tenant_hash === 'a')?.on_time_rate_pct).toBe(50);
    expect(rows.find((r) => r.tenant_hash === 'b')?.on_time_rate_pct).toBe(100);
  });

  it('builds comparison message', () => {
    const msg = buildPeerComparisonMessage(92, 80, 'Klein Windhoek', 12);
    expect(msg).toContain('92%');
    expect(msg).toContain('80%');
    expect(msg).toContain('Klein Windhoek');
  });
});
