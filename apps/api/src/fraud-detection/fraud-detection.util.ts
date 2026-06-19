export type LandlordConfirmStats = {
  landlordUserId: string;
  eftConfirmedCount: number;
  avgConfirmationHours: number;
  autoConfirmRatePct: number;
};

export type ConfirmAnomalyResult = {
  landlordUserId: string;
  reason: string;
  severity: 'medium' | 'high';
  metadata: Record<string, unknown>;
};

/** Flags landlords whose confirm speed or auto-confirm rate deviates sharply from platform baseline. */
export function detectConfirmRateAnomalies(
  landlords: LandlordConfirmStats[],
  platformMedianHours: number,
  options?: { minSample?: number; fastFactor?: number; highAutoPct?: number },
): ConfirmAnomalyResult[] {
  const minSample = options?.minSample ?? 5;
  const fastFactor = options?.fastFactor ?? 0.2;
  const highAutoPct = options?.highAutoPct ?? 90;
  const results: ConfirmAnomalyResult[] = [];

  for (const row of landlords) {
    if (row.eftConfirmedCount < minSample) continue;

    const tooFast =
      platformMedianHours > 0 && row.avgConfirmationHours < platformMedianHours * fastFactor;
    const suspiciousAuto = row.autoConfirmRatePct >= highAutoPct && row.avgConfirmationHours < 3;

    if (tooFast) {
      results.push({
        landlordUserId: row.landlordUserId,
        reason: `Confirmation time (${row.avgConfirmationHours}h) is far below platform median (${platformMedianHours}h)`,
        severity: 'high',
        metadata: {
          avg_confirmation_hours: row.avgConfirmationHours,
          platform_median_hours: platformMedianHours,
          eft_confirmed_count: row.eftConfirmedCount,
          pattern: 'FAST_CONFIRM',
        },
      });
    } else if (suspiciousAuto) {
      results.push({
        landlordUserId: row.landlordUserId,
        reason: `Auto-confirm rate ${row.autoConfirmRatePct}% with very low lag — review for rubber-stamping`,
        severity: 'medium',
        metadata: {
          auto_confirm_rate_pct: row.autoConfirmRatePct,
          avg_confirmation_hours: row.avgConfirmationHours,
          eft_confirmed_count: row.eftConfirmedCount,
          pattern: 'HIGH_AUTO_CONFIRM',
        },
      });
    }
  }

  return results;
}

export type PaymentIpPair = {
  paymentId: string;
  tenantUserId: string;
  landlordUserId: string;
  tenantIp: string | null;
  landlordIp: string | null;
};

export type SelfDealingResult = {
  tenantUserId: string;
  landlordUserId: string;
  sharedIp: string;
  paymentCount: number;
};

function ipPrefix(ip: string): string {
  const trimmed = ip.trim();
  if (trimmed.includes(':')) {
    return trimmed.split(':').slice(0, 4).join(':');
  }
  const octets = trimmed.split('.');
  return octets.length >= 3 ? octets.slice(0, 3).join('.') : trimmed;
}

/** Detect tenant/landlord pairs sharing IP prefix across multiple confirmed payments. */
export function detectSelfDealingPatterns(pairs: PaymentIpPair[], minMatches = 2): SelfDealingResult[] {
  const bucket = new Map<string, { tenantUserId: string; landlordUserId: string; sharedIp: string; paymentIds: Set<string> }>();

  for (const row of pairs) {
    if (!row.tenantIp || !row.landlordIp) continue;
    const tenantPrefix = ipPrefix(row.tenantIp);
    const landlordPrefix = ipPrefix(row.landlordIp);
    if (tenantPrefix !== landlordPrefix) continue;
    const key = `${row.tenantUserId}|${row.landlordUserId}|${tenantPrefix}`;
    const existing = bucket.get(key);
    if (existing) {
      existing.paymentIds.add(row.paymentId);
    } else {
      bucket.set(key, {
        tenantUserId: row.tenantUserId,
        landlordUserId: row.landlordUserId,
        sharedIp: tenantPrefix,
        paymentIds: new Set([row.paymentId]),
      });
    }
  }

  return [...bucket.values()]
    .filter((v) => v.paymentIds.size >= minMatches)
    .map((v) => ({
      tenantUserId: v.tenantUserId,
      landlordUserId: v.landlordUserId,
      sharedIp: v.sharedIp,
      paymentCount: v.paymentIds.size,
    }));
}
