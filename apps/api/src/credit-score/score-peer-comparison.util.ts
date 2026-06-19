import { MIN_SUBURB_SAMPLE } from '../market-intelligence/market-intelligence.utils';

export type PeerRateRow = {
  tenant_hash: string;
  on_time_rate_pct: number;
  payment_count: number;
};

export function shouldSuppressPeerComparison(sampleSize: number): boolean {
  return sampleSize < MIN_SUBURB_SAMPLE;
}

/** Share of peer tenants (excluding self) with a strictly lower on-time rate. */
export function percentileBetterThanPeers(yourRate: number, peerRates: number[]): number {
  if (!peerRates.length) return 0;
  const lower = peerRates.filter((rate) => rate < yourRate).length;
  return Math.round((lower / peerRates.length) * 100);
}

export function buildPeerComparisonMessage(
  yourRate: number,
  percentile: number,
  suburbDisplay: string,
  sampleSize: number,
): string {
  return `Your on-time rate (${yourRate}%) is better than ${percentile}% of tenants in ${suburbDisplay} (based on ${sampleSize} verified tenants).`;
}

export function aggregatePeerRatesFromMarketRecords(
  records: Array<{ tenant_hash: string; payment_status: string; suburb: string }>,
  suburbMatcher: (recordSuburb: string) => boolean,
): PeerRateRow[] {
  const buckets = new Map<string, { onTime: number; total: number }>();

  for (const record of records) {
    if (!record.tenant_hash || !suburbMatcher(record.suburb)) continue;
    const bucket = buckets.get(record.tenant_hash) || { onTime: 0, total: 0 };
    bucket.total += 1;
    if (record.payment_status === 'on_time') bucket.onTime += 1;
    buckets.set(record.tenant_hash, bucket);
  }

  return [...buckets.entries()].map(([tenant_hash, bucket]) => ({
    tenant_hash,
    on_time_rate_pct: Math.round((bucket.onTime / bucket.total) * 100),
    payment_count: bucket.total,
  }));
}
