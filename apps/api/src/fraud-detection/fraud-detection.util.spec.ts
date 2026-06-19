import { describe, expect, it } from 'vitest';
import { detectConfirmRateAnomalies, detectSelfDealingPatterns } from './fraud-detection.util';

describe('detectConfirmRateAnomalies', () => {
  it('flags landlords confirming far faster than platform median', () => {
    const flags = detectConfirmRateAnomalies(
      [{ landlordUserId: 'l1', eftConfirmedCount: 10, avgConfirmationHours: 2, autoConfirmRatePct: 40 }],
      24,
    );
    expect(flags).toHaveLength(1);
    expect(flags[0].severity).toBe('high');
  });

  it('ignores small sample sizes', () => {
    const flags = detectConfirmRateAnomalies(
      [{ landlordUserId: 'l1', eftConfirmedCount: 2, avgConfirmationHours: 1, autoConfirmRatePct: 100 }],
      24,
    );
    expect(flags).toHaveLength(0);
  });
});

describe('detectSelfDealingPatterns', () => {
  it('flags pairs with shared IP prefix on multiple payments', () => {
    const flags = detectSelfDealingPatterns([
      { paymentId: 'p1', tenantUserId: 't1', landlordUserId: 'l1', tenantIp: '41.203.10.5', landlordIp: '41.203.10.88' },
      { paymentId: 'p2', tenantUserId: 't1', landlordUserId: 'l1', tenantIp: '41.203.10.9', landlordIp: '41.203.10.2' },
    ]);
    expect(flags).toHaveLength(1);
    expect(flags[0].paymentCount).toBe(2);
    expect(flags[0].sharedIp).toBe('41.203.10');
  });

  it('does not flag single shared-ip payment', () => {
    const flags = detectSelfDealingPatterns([
      { paymentId: 'p1', tenantUserId: 't1', landlordUserId: 'l1', tenantIp: '10.0.0.1', landlordIp: '10.0.0.2' },
    ]);
    expect(flags).toHaveLength(0);
  });
});
