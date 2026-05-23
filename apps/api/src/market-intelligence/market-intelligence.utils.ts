import { createHash } from 'crypto';

export const MIN_SUBURB_SAMPLE = 5;
export const MIN_STATISTICAL_SUBURB_SAMPLE = 10;

export function hashUserId(userId: string): string {
  return createHash('sha256').update(`rentcredit-mi:${userId}`).digest('hex');
}

export function incomeToBracket(monthlyIncome: number | null | undefined): string | null {
  if (monthlyIncome == null || Number.isNaN(Number(monthlyIncome))) return null;
  const income = Number(monthlyIncome);
  if (income < 5000) return 'N$0–N$5k';
  if (income < 10000) return 'N$5k–N$10k';
  if (income < 15000) return 'N$10k–N$15k';
  if (income < 20000) return 'N$15k–N$20k';
  if (income < 30000) return 'N$20k–N$30k';
  if (income < 50000) return 'N$30k–N$50k';
  return 'N$50k+';
}

export function derivePaymentStatus(daysToPay: number, paymentStatus: string): 'on_time' | 'late' | 'missed' {
  if (paymentStatus !== 'PAID') return 'missed';
  if (daysToPay <= 0) return 'on_time';
  return 'late';
}

export function daysBetween(dueDate: string, paidDate: string | null): number {
  if (!paidDate) return 0;
  const due = new Date(dueDate);
  const paid = new Date(paidDate);
  return Math.max(0, Math.floor((paid.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
}

export function monthYearFromDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function computeTrend(monthlyAvgs: { month: string; avg: number }[]): 'Stable' | 'Rising' | 'Falling' {
  if (monthlyAvgs.length < 2) return 'Stable';
  const recent = monthlyAvgs.slice(-3);
  if (recent.length < 2) return 'Stable';
  const first = recent[0].avg;
  const last = recent[recent.length - 1].avg;
  const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
  if (changePct > 3) return 'Rising';
  if (changePct < -3) return 'Falling';
  return 'Stable';
}

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = `rc_${createHash('sha256').update(`${Date.now()}-${Math.random()}`).digest('hex').slice(0, 32)}`;
  const prefix = raw.slice(0, 8);
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, prefix, hash };
}
