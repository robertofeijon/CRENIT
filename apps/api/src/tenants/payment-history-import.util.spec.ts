import { describe, expect, it } from 'vitest';
import { parsePaymentHistoryCsv } from './payment-history-import.util';

describe('parsePaymentHistoryCsv', () => {
  it('parses headered CSV rows', () => {
    const csv = `month_year,amount,reference,on_time
2025-01,8500,REF1,yes
2025-02,8500,REF2,no`;
    const result = parsePaymentHistoryCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].period_month).toBe('2025-01-01');
    expect(result.rows[1].on_time).toBe(false);
  });

  it('rejects invalid month format', () => {
    const result = parsePaymentHistoryCsv('Jan-2025,8500');
    expect(result.rows).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
