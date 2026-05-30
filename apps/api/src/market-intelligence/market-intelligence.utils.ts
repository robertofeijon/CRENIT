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

export type IntelligenceTimeframePreset = 'today' | '7d' | '30d' | '90d' | 'qtd' | 'ytd' | 'all';

export type IntelligenceFilters = {
  from: Date | null;
  to: Date;
  city?: string;
  suburb?: string;
  property_type?: string;
  bedrooms?: number;
  payment_status?: 'on_time' | 'late' | 'missed';
};

export function resolveIntelligenceTimeframe(preset: string): { from: Date | null; to: Date } {
  const to = new Date();
  const normalized = (preset || '30d').toLowerCase() as IntelligenceTimeframePreset;
  const startOfDay = (d: Date) => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };

  if (normalized === 'today') {
    return { from: startOfDay(to), to };
  }
  if (normalized === '7d') {
    const from = new Date(to);
    from.setDate(from.getDate() - 7);
    return { from, to };
  }
  if (normalized === '90d') {
    const from = new Date(to);
    from.setDate(from.getDate() - 90);
    return { from, to };
  }
  if (normalized === 'qtd') {
    const from = new Date(to.getFullYear(), Math.floor(to.getMonth() / 3) * 3, 1);
    return { from, to };
  }
  if (normalized === 'ytd') {
    return { from: new Date(to.getFullYear(), 0, 1), to };
  }
  if (normalized === 'all') {
    return { from: null, to };
  }
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { from, to };
}

export function parseIntelligenceFilters(query: {
  timeframe?: string;
  city?: string;
  suburb?: string;
  property_type?: string;
  bedrooms?: string;
  payment_status?: string;
}): IntelligenceFilters {
  const { from, to } = resolveIntelligenceTimeframe(query.timeframe ?? '30d');
  const bedrooms = query.bedrooms ? Number(query.bedrooms) : undefined;
  const paymentStatus = query.payment_status as IntelligenceFilters['payment_status'] | undefined;
  return {
    from,
    to,
    city: query.city?.trim() || undefined,
    suburb: query.suburb?.trim() || undefined,
    property_type: query.property_type?.trim() || undefined,
    bedrooms: Number.isFinite(bedrooms) ? bedrooms : undefined,
    payment_status:
      paymentStatus === 'on_time' || paymentStatus === 'late' || paymentStatus === 'missed' ? paymentStatus : undefined,
  };
}

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = `rc_${createHash('sha256').update(`${Date.now()}-${Math.random()}`).digest('hex').slice(0, 32)}`;
  const prefix = raw.slice(0, 8);
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, prefix, hash };
}
