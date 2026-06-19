import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { brandTierFromScore100, brandTierProgress } from './tier-branding';
import { buildScoreAnnotation, type ScoreEventType } from './score-narrative.util';
import {
  aggregatePeerRatesFromMarketRecords,
  buildPeerComparisonMessage,
  percentileBetterThanPeers,
  shouldSuppressPeerComparison,
} from './score-peer-comparison.util';
import { hashUserId } from '../market-intelligence/market-intelligence.utils';
import { suburbsMatch } from '../market-intelligence/market-intelligence-geocode.util';
import { computeOnTimeRatePct } from '../payments/payment-metrics.util';

/** CRENIT rental credit model — score out of 100 */
export type CrenitRiskTier = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';

export type ScoreEventContext = {
  event_type: ScoreEventType;
  due_date?: string | null;
  paid_date?: string | null;
  dispute_type?: string | null;
  decision?: string | null;
  payment_id?: string | null;
  lease_id?: string | null;
};

@Injectable()
export class CreditScoreService {
  private readonly logger = new Logger(CreditScoreService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /** Payment History — 50 points max: (on-time ÷ total) × 50 */
  private paymentHistoryPoints(onTime: number, total: number): number {
    if (total === 0) return 25;
    return Math.round((onTime / total) * 50 * 10) / 10;
  }

  /** Amount Defaulted On — 30 points max */
  private defaultAmountPoints(defaultAmount: number, annualRent: number): number {
    if (defaultAmount <= 0 || annualRent <= 0) return 30;
    const monthsRent = defaultAmount / (annualRent / 12);
    if (monthsRent < 1) return 24;
    if (monthsRent <= 2) return 18;
    if (monthsRent <= 3) return 10;
    return 0;
  }

  /** Length of Rental Credit History — 20 points max */
  private historyLengthPoints(monthsActive: number): number {
    if (monthsActive < 6) return 5;
    if (monthsActive < 12) return 10;
    if (monthsActive < 36) return 15;
    return 20;
  }

  private riskTierFromScore(score100: number): CrenitRiskTier {
    if (score100 >= 80) return 'LOW';
    if (score100 >= 65) return 'MODERATE';
    if (score100 >= 50) return 'HIGH';
    return 'VERY_HIGH';
  }

  /** Legacy display tier for UI compatibility */
  private legacyTier(score100: number): string {
    if (score100 >= 80) return 'EXCELLENT';
    if (score100 >= 65) return 'GOOD';
    if (score100 >= 50) return 'FAIR';
    return 'BUILDING';
  }

  /** Map 0–100 model to 300–900 scale for existing UI gauges */
  private toDisplayScore(score100: number): number {
    return Math.round(300 + (score100 / 100) * 600);
  }

  async calculateScore(tenantId: string, event?: ScoreEventContext) {
    const client = this.supabase.getClient();
    const previousScore = await this.getPreviousDisplayScore(tenantId);

    const { data: payments } = await client
      .from('payments')
      .select('amount_gross, status, due_date, paid_date, days_overdue')
      .eq('tenant_id', tenantId)
      .order('due_date', { ascending: false });

    const { data: leases } = await client.from('leases').select('start_date, monthly_rent, status').eq('tenant_id', tenantId);

    const paidPayments = (payments || []).filter((p: any) => p.status === 'PAID' || p.paid_date);
    const totalPayments = paidPayments.length;
    const onTimePayments = paidPayments.filter((p: any) => {
      if (!p.paid_date || !p.due_date) return false;
      const paid = new Date(p.paid_date);
      const due = new Date(p.due_date);
      return paid <= due || Number(p.days_overdue || 0) === 0;
    }).length;

    const defaultedAmount = (payments || [])
      .filter((p: any) => p.status !== 'PAID' && !p.paid_date)
      .reduce((sum: number, p: any) => sum + Number(p.amount_gross || 0), 0);

    const activeLease = (leases || []).find((l: any) => l.status === 'ACTIVE') || leases?.[0];
    const monthlyRent = Number(activeLease?.monthly_rent || 0);
    const annualRent = monthlyRent * 12;

    let monthsActive = 0;
    if (leases?.length) {
      const earliest = leases.reduce((acc: Date | null, l: any) => {
        const d = new Date(l.start_date);
        return !acc || d < acc ? d : acc;
      }, null as Date | null);
      if (earliest) {
        monthsActive = Math.max(0, Math.floor((Date.now() - earliest.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      }
    }

    const paymentHistoryScore = this.paymentHistoryPoints(onTimePayments, totalPayments);
    const defaultScore = this.defaultAmountPoints(defaultedAmount, annualRent);
    const historyScore = this.historyLengthPoints(monthsActive);

    const score100 = Math.round((paymentHistoryScore + defaultScore + historyScore) * 10) / 10;
    const riskTier = this.riskTierFromScore(score100);
    const displayScore = this.toDisplayScore(score100);
    const tier = this.legacyTier(score100);

    await client.from('credit_scores').update({ is_current: false }).eq('tenant_id', tenantId).eq('is_current', true);

    const { data: inserted } = await client
      .from('credit_scores')
      .insert([
        {
          tenant_id: tenantId,
          score: displayScore,
          tier,
          payment_history_score: Math.round(paymentHistoryScore),
          streak_score: Math.round(defaultScore),
          history_length_score: Math.round(historyScore),
          income_rent_ratio_score: 0,
          deposit_management_score: 0,
          is_current: true,
        },
      ])
      .select()
      .limit(1);

    const scoreId = inserted?.[0]?.id ?? null;

    const factors = [
      {
        factor_name: 'payment_history',
        weight: 0.5,
        raw_value: totalPayments ? Math.round((onTimePayments / totalPayments) * 100) : null,
        weighted_contribution: paymentHistoryScore,
      },
      {
        factor_name: 'amount_defaulted',
        weight: 0.3,
        raw_value: defaultedAmount,
        weighted_contribution: defaultScore,
      },
      {
        factor_name: 'history_length',
        weight: 0.2,
        raw_value: monthsActive,
        weighted_contribution: historyScore,
      },
    ];

    if (scoreId) {
      await client.from('credit_score_factors').insert(factors.map((f) => ({ score_id: scoreId, ...f })));
    }

    try {
      const scoreDelta = previousScore != null ? displayScore - previousScore : 0;
      const shouldRecord = Boolean(event) || scoreDelta !== 0;
      if (shouldRecord) {
        const eventType = event?.event_type ?? (scoreDelta !== 0 ? 'CALCULATED' : 'CALCULATED');
        const annotation = buildScoreAnnotation({
          event_type: eventType,
          score_delta: scoreDelta,
          due_date: event?.due_date,
          paid_date: event?.paid_date,
          dispute_type: event?.dispute_type,
          decision: event?.decision,
        });
        const metadata = await this.buildScoreHistoryMetadata(tenantId, event);
        await client.from('score_history').insert([
          {
            tenant_id: tenantId,
            score: displayScore,
            tier,
            recorded_at: new Date().toISOString(),
            event_type: eventType,
            event_reason: annotation,
            score_delta: previousScore != null ? scoreDelta : null,
            metadata,
          },
        ]);
      }
    } catch (e) {
      this.logger.warn(`Could not persist score history: ${(e as Error).message}`);
    }

    this.logger.log(`CRENIT score for ${tenantId}: ${score100}/100 (${riskTier}) → display ${displayScore}`);

    return {
      tenantId,
      score: displayScore,
      score_100: score100,
      tier,
      risk_tier: riskTier,
      scoreId,
      factors,
      breakdown: {
        paymentHistoryScore,
        defaultScore,
        historyScore,
        paymentHistoryPct: totalPayments ? Math.round((onTimePayments / totalPayments) * 100) : 100,
        onTimePayments,
        totalPayments,
        defaultedAmount,
        monthsActive,
        annualRent,
      },
    };
  }

  async getCurrentScoreDetails(tenantId: string) {
    const client = this.supabase.getClient();
    const { data: score, error } = await client
      .from('credit_scores')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_current', true)
      .order('calculation_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!score) return this.calculateScore(tenantId);

    const { data: factors } = await client.from('credit_score_factors').select('*').eq('score_id', score.id);
    const display = score.score;
    const score100 = Math.round(((display - 300) / 600) * 1000) / 10;

    return {
      tenantId,
      score: display,
      score_100: score100,
      tier: score.tier,
      risk_tier: this.riskTierFromScore(score100),
      calculation_date: score.calculation_date,
      factors: factors || [],
      breakdown: {
        paymentHistoryScore: score.payment_history_score,
        defaultScore: score.streak_score,
        historyScore: score.history_length_score,
      },
    };
  }

  async calculateAllScores() {
    const client = this.supabase.getClient();
    const { data, error } = await client.from('profiles').select('id').eq('role', 'TENANT');
    if (error) throw error;
    const tenantIds = (data || []).map((p: any) => p.id).filter(Boolean);
    for (const tenantId of tenantIds) {
      try {
        await this.calculateScore(tenantId);
      } catch (err) {
        this.logger.error(`Failed to recalculate score for tenant ${tenantId}`, err as any);
      }
    }
    return { tenant_count: tenantIds.length, recalculated_at: new Date().toISOString() };
  }

  async calculateScoresForRecentPaymentUpdates(hoursBack = 24) {
    const client = this.supabase.getClient();
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
    const { data, error } = await client.from('payments').select('tenant_id').not('tenant_id', 'is', null).gte('updated_at', since);
    if (error) throw error;
    const tenantIds = Array.from(
      new Set((data || []).map((r: { tenant_id?: string }) => r.tenant_id).filter((id): id is string => Boolean(id))),
    );
    for (const tenantId of tenantIds) {
      try {
        await this.calculateScore(tenantId);
      } catch (err) {
        this.logger.error(`Failed to recalculate score for tenant ${tenantId}`, err as any);
      }
    }
    return { tenant_count: tenantIds.length, recalculated_at: new Date().toISOString() };
  }

  private async getPreviousDisplayScore(tenantId: string): Promise<number | null> {
    const client = this.supabase.getClient();
    const { data } = await client
      .from('credit_scores')
      .select('score')
      .eq('tenant_id', tenantId)
      .eq('is_current', true)
      .maybeSingle();
    return data?.score != null ? Number(data.score) : null;
  }

  async getScoreHistory(tenantId: string, limit = 12) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('score_history')
      .select('score, tier, recorded_at, event_type, event_reason, score_delta, metadata')
      .eq('tenant_id', tenantId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) {
      const { data: fallback } = await client
        .from('credit_scores')
        .select('score, tier, calculation_date')
        .eq('tenant_id', tenantId)
        .order('calculation_date', { ascending: true })
        .limit(limit);
      return (fallback || []).map((row: any) => ({
        score: row.score,
        tier: row.tier,
        recorded_at: row.calculation_date,
      }));
    }
    return (data || []).slice().reverse();
  }

  getMilestoneGuidance(score: number) {
    const score100 = Math.round(((score - 300) / 600) * 1000) / 10;
    const progress = brandTierProgress(score100);
    if (!progress.next) {
      return {
        nextTier: null,
        pointsNeeded: 0,
        brandTier: progress.current,
        message: `${progress.current.label} tier — keep paying on time to maintain your profile.`,
      };
    }
    return {
      nextTier: progress.next.label,
      pointsNeeded: progress.pointsToNext,
      brandTier: progress.current,
      message: `${progress.pointsToNext} points to reach ${progress.next.label}. ${progress.next.unlocks}`,
    };
  }

  private async loadScoreInputs(tenantId: string) {
    const client = this.supabase.getClient();
    const { data: payments } = await client
      .from('payments')
      .select('amount_gross, status, due_date, paid_date, days_overdue')
      .eq('tenant_id', tenantId)
      .order('due_date', { ascending: false });
    const { data: leases } = await client.from('leases').select('start_date, monthly_rent, status').eq('tenant_id', tenantId);

    const paidPayments = (payments || []).filter((p: any) => p.status === 'PAID' || p.paid_date);
    const totalPayments = paidPayments.length;
    const onTimePayments = paidPayments.filter((p: any) => {
      if (!p.paid_date || !p.due_date) return false;
      return new Date(p.paid_date) <= new Date(p.due_date) || Number(p.days_overdue || 0) === 0;
    }).length;

    const defaultedAmount = (payments || [])
      .filter((p: any) => p.status !== 'PAID' && !p.paid_date)
      .reduce((sum: number, p: any) => sum + Number(p.amount_gross || 0), 0);

    const activeLease = (leases || []).find((l: any) => l.status === 'ACTIVE') || leases?.[0];
    const monthlyRent = Number(activeLease?.monthly_rent || 0);
    const annualRent = monthlyRent * 12;

    let monthsActive = 0;
    if (leases?.length) {
      const earliest = leases.reduce((acc: Date | null, l: any) => {
        const d = new Date(l.start_date);
        return !acc || d < acc ? d : acc;
      }, null as Date | null);
      if (earliest) {
        monthsActive = Math.max(0, Math.floor((Date.now() - earliest.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      }
    }

    return { totalPayments, onTimePayments, defaultedAmount, annualRent, monthsActive };
  }

  private computeScore100FromInputs(inputs: {
    totalPayments: number;
    onTimePayments: number;
    defaultedAmount: number;
    annualRent: number;
    monthsActive: number;
  }) {
    const paymentHistoryScore = this.paymentHistoryPoints(inputs.onTimePayments, inputs.totalPayments);
    const defaultScore = this.defaultAmountPoints(inputs.defaultedAmount, inputs.annualRent);
    const historyScore = this.historyLengthPoints(inputs.monthsActive);
    return {
      score100: Math.round((paymentHistoryScore + defaultScore + historyScore) * 10) / 10,
      paymentHistoryScore,
      defaultScore,
      historyScore,
    };
  }

  async getInsights(tenantId: string) {
    const current = await this.getCurrentScoreDetails(tenantId);
    const score100 = current.score_100 ?? Math.round(((current.score - 300) / 600) * 1000) / 10;
    const inputs = await this.loadScoreInputs(tenantId);
    const brand = brandTierFromScore100(score100);
    const progress = brandTierProgress(score100);

    const holdingBack: string[] = [];
    const onTimeRate = inputs.totalPayments ? inputs.onTimePayments / inputs.totalPayments : 1;
    if (onTimeRate < 1 && inputs.totalPayments > 0) {
      const missed = inputs.totalPayments - inputs.onTimePayments;
      const sim = this.computeScore100FromInputs({
        ...inputs,
        onTimePayments: inputs.onTimePayments + Math.min(3, missed),
        totalPayments: inputs.totalPayments + Math.min(3, missed),
      });
      const delta = Math.round((sim.score100 - score100) * 10) / 10;
      if (delta > 0) {
        holdingBack.push(
          `Your score could improve by ~${delta} points if your next ${Math.min(3, missed)} payment(s) are on-time.`,
        );
      }
    }
    if (inputs.defaultedAmount > 0) {
      holdingBack.push(
        `Outstanding unpaid rent (N$${inputs.defaultedAmount.toLocaleString()}) is reducing your default factor — clear arrears to recover up to 30 points.`,
      );
    }
    if (inputs.monthsActive < 12) {
      holdingBack.push(
        `History length is ${inputs.monthsActive} months — reaching 12+ months of verified payments unlocks more history points.`,
      );
    }
    if (!holdingBack.length) {
      holdingBack.push('You are on track — keep paying on time each month to maintain or grow your tier.');
    }

    const history = (await this.getScoreHistory(tenantId, 24)) as Array<{
      recorded_at: string;
      score: number;
      score_delta?: number | null;
      event_type?: string | null;
      event_reason?: string | null;
      metadata?: Record<string, unknown> | null;
    }>;
    const narrative_timeline = history
      .filter((row) => Boolean(row.event_reason))
      .map((row) => ({
        recorded_at: row.recorded_at,
        score: row.score,
        score_delta: row.score_delta,
        event_type: row.event_type,
        annotation: row.event_reason,
        lease_id: row.metadata?.lease_id ?? null,
        landlord_name: row.metadata?.landlord_name ?? null,
        property_label: row.metadata?.property_label ?? null,
        suburb: row.metadata?.suburb ?? null,
      }))
      .reverse();

    const [peer_comparison, lease_summaries] = await Promise.all([
      this.getPeerComparison(tenantId),
      this.getTenantLeaseSummaries(tenantId),
    ]);

    return {
      score_100: score100,
      brand_tier: brand,
      tier_progress: progress,
      holding_back: holdingBack,
      narrative_timeline,
      peer_comparison,
      lease_summaries,
      unified_timeline: narrative_timeline,
      factors_summary: {
        on_time_rate_pct: inputs.totalPayments ? Math.round(onTimeRate * 100) : 100,
        months_active: inputs.monthsActive,
        defaulted_amount: inputs.defaultedAmount,
      },
    };
  }

  async simulateScore(tenantId: string, monthsOnTime: number) {
    const months = Math.min(24, Math.max(0, Math.floor(monthsOnTime)));
    const inputs = await this.loadScoreInputs(tenantId);
    const current = this.computeScore100FromInputs(inputs);
    const projected = this.computeScore100FromInputs({
      ...inputs,
      onTimePayments: inputs.onTimePayments + months,
      totalPayments: inputs.totalPayments + months,
      monthsActive: inputs.monthsActive + months,
      defaultedAmount: months > 0 ? 0 : inputs.defaultedAmount,
    });
    const currentBrand = brandTierFromScore100(current.score100);
    const projectedBrand = brandTierFromScore100(projected.score100);

    return {
      disclaimer: 'Estimate only — assumes on-time payments with no new defaults.',
      months_on_time: months,
      current: {
        score_100: current.score100,
        brand_tier: currentBrand,
      },
      projected: {
        score_100: projected.score100,
        brand_tier: projectedBrand,
        points_gain: Math.round((projected.score100 - current.score100) * 10) / 10,
      },
    };
  }

  enrichWithBrandTier<T extends { score?: number; score_100?: number }>(data: T) {
    const score100 = data.score_100 ?? (data.score != null ? Math.round(((data.score - 300) / 600) * 1000) / 10 : 0);
    const brand = brandTierFromScore100(score100);
    const progress = brandTierProgress(score100);
    return {
      ...data,
      score_100: score100,
      brand_tier: brand,
      tier_progress: progress,
    };
  }

  private async buildScoreHistoryMetadata(tenantId: string, event?: ScoreEventContext) {
    let leaseId = event?.lease_id || null;
    if (!leaseId && event?.payment_id) {
      const client = this.supabase.getClient();
      const { data: payment } = await client.from('payments').select('lease_id').eq('id', event.payment_id).maybeSingle();
      leaseId = payment?.lease_id || null;
    }
    if (!leaseId) return {};
    const context = await this.resolveLeaseDisplayContext(leaseId, tenantId);
    return context || {};
  }

  private async resolveLeaseDisplayContext(leaseId: string, tenantId: string) {
    const client = this.supabase.getClient();
    const { data: lease } = await client
      .from('leases')
      .select('id, tenant_id, landlord_id, unit_id, status, start_date')
      .eq('id', leaseId)
      .maybeSingle();
    if (!lease || lease.tenant_id !== tenantId) return null;

    const [{ data: unit }, { data: landlordProfile }] = await Promise.all([
      lease.unit_id
        ? client.from('units').select('property_id, unit_identifier').eq('id', lease.unit_id).maybeSingle()
        : Promise.resolve({ data: null }),
      lease.landlord_id
        ? client.from('landlord_profiles').select('user_id, business_name').eq('id', lease.landlord_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    let property: { address_suburb?: string; address_street?: string; address_city?: string } | null = null;
    if (unit?.property_id) {
      const { data } = await client
        .from('properties')
        .select('address_suburb, address_street, address_city')
        .eq('id', unit.property_id)
        .maybeSingle();
      property = data;
    }

    let landlordName = landlordProfile?.business_name || 'Landlord';
    if (landlordProfile?.user_id) {
      const { data: profile } = await client.from('profiles').select('full_name').eq('id', landlordProfile.user_id).maybeSingle();
      if (profile?.full_name) landlordName = profile.full_name;
    }

    const propertyLabel = [property?.address_street, property?.address_suburb].filter(Boolean).join(', ') || 'Rental property';

    return {
      lease_id: lease.id,
      lease_status: lease.status,
      landlord_name: landlordName,
      property_label: propertyLabel,
      suburb: property?.address_suburb || null,
      unit_identifier: unit?.unit_identifier || null,
    };
  }

  private async resolveTenantSuburb(tenantId: string): Promise<{ suburb: string; city: string } | null> {
    const client = this.supabase.getClient();
    const { data: leases } = await client
      .from('leases')
      .select('id, unit_id, status, start_date')
      .eq('tenant_id', tenantId)
      .order('start_date', { ascending: false });
    const lease = (leases || []).find((l) => l.status === 'ACTIVE') || leases?.[0];
    if (!lease?.unit_id) return null;

    const { data: unit } = await client.from('units').select('property_id').eq('id', lease.unit_id).maybeSingle();
    if (!unit?.property_id) return null;

    const { data: property } = await client
      .from('properties')
      .select('address_suburb, address_city')
      .eq('id', unit.property_id)
      .maybeSingle();
    if (!property?.address_suburb) return null;
    return { suburb: property.address_suburb, city: property.address_city || 'Windhoek' };
  }

  async getTenantLeaseSummaries(tenantId: string) {
    const client = this.supabase.getClient();
    const { data: leases } = await client
      .from('leases')
      .select('id, status, start_date, end_date, landlord_id, unit_id')
      .eq('tenant_id', tenantId)
      .order('start_date', { ascending: false });
    if (!leases?.length) return [];

    const summaries = [];
    for (const lease of leases) {
      const context = await this.resolveLeaseDisplayContext(lease.id, tenantId);
      const { count } = await client
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('lease_id', lease.id)
        .eq('status', 'PAID');
      summaries.push({
        lease_id: lease.id,
        status: lease.status,
        start_date: lease.start_date,
        end_date: lease.end_date,
        landlord_name: context?.landlord_name || 'Landlord',
        property_label: context?.property_label || 'Rental property',
        suburb: context?.suburb || null,
        confirmed_payments: count ?? 0,
      });
    }
    return summaries;
  }

  async getPeerComparison(tenantId: string) {
    const suburbInfo = await this.resolveTenantSuburb(tenantId);
    if (!suburbInfo) {
      return { available: false, suppressed: true, reason: 'no_suburb' };
    }

    const yourRate = computeOnTimeRatePct(await this.loadTenantPaymentsForMetrics(tenantId), 12);

    const client = this.supabase.getClient();
    let peerRows: Array<{ tenant_hash: string; on_time_rate_pct: number }> = [];

    try {
      const { data: miRecords } = await client
        .schema('market_intelligence')
        .from('market_data_records')
        .select('tenant_hash, payment_status, suburb')
        .ilike('suburb', `%${suburbInfo.suburb.split(' ')[0]}%`);

      peerRows = aggregatePeerRatesFromMarketRecords(miRecords || [], (recordSuburb) =>
        suburbsMatch(recordSuburb, suburbInfo.suburb),
      );
    } catch (e) {
      this.logger.warn(`Peer comparison MI fetch failed: ${(e as Error).message}`);
    }

    let dataSource: 'market_data_records' | 'platform_payments' = 'market_data_records';
    if (shouldSuppressPeerComparison(peerRows.length)) {
      const fallbackRates = await this.computeSuburbPeerRatesFromPayments(suburbInfo.suburb);
      if (shouldSuppressPeerComparison(fallbackRates.length)) {
        return {
          available: false,
          suppressed: true,
          reason: 'insufficient_sample',
          suburb: suburbInfo.suburb,
          required_minimum_sample: 5,
          your_on_time_rate_pct: yourRate,
        };
      }
      peerRows = fallbackRates.map((row) => ({
        tenant_hash: row.tenant_id,
        on_time_rate_pct: row.on_time_rate_pct,
      }));
      dataSource = 'platform_payments';
    }

    const tenantHash = hashUserId(tenantId);
    const peerRatesExcludingSelf = peerRows
      .filter((row) => row.tenant_hash !== tenantHash)
      .map((row) => row.on_time_rate_pct);

    if (shouldSuppressPeerComparison(peerRatesExcludingSelf.length + 1)) {
      return {
        available: false,
        suppressed: true,
        reason: 'insufficient_sample',
        suburb: suburbInfo.suburb,
        required_minimum_sample: 5,
        your_on_time_rate_pct: yourRate,
      };
    }

    const percentile = percentileBetterThanPeers(yourRate, peerRatesExcludingSelf);
    return {
      available: true,
      suppressed: false,
      suburb: suburbInfo.suburb,
      your_on_time_rate_pct: yourRate,
      percentile_better_than: percentile,
      sample_size: peerRatesExcludingSelf.length + 1,
      message: buildPeerComparisonMessage(yourRate, percentile, suburbInfo.suburb, peerRatesExcludingSelf.length + 1),
      data_source: dataSource,
    };
  }

  private async loadTenantPaymentsForMetrics(tenantId: string) {
    const client = this.supabase.getClient();
    const { data } = await client
      .from('payments')
      .select('status, due_date, paid_date, days_overdue')
      .eq('tenant_id', tenantId)
      .order('due_date', { ascending: false });
    return data || [];
  }

  private async computeSuburbPeerRatesFromPayments(suburb: string) {
    const client = this.supabase.getClient();
    const { data: properties } = await client.from('properties').select('id, address_suburb');
    const propertyIds = (properties || [])
      .filter((p) => suburbsMatch(p.address_suburb, suburb))
      .map((p) => p.id);
    if (!propertyIds.length) return [];

    const { data: units } = await client.from('units').select('id, property_id').in('property_id', propertyIds);
    const unitIds = (units || []).map((u) => u.id);
    if (!unitIds.length) return [];

    const { data: leases } = await client.from('leases').select('id, tenant_id, unit_id').in('unit_id', unitIds);
    const tenantIds = [...new Set((leases || []).map((l) => l.tenant_id).filter(Boolean))] as string[];
    if (!tenantIds.length) return [];

    const rates: Array<{ tenant_id: string; on_time_rate_pct: number }> = [];
    for (const tenantId of tenantIds) {
      const payments = await this.loadTenantPaymentsForMetrics(tenantId);
      const settled = payments.filter((p) => p.status === 'PAID' || p.paid_date);
      if (!settled.length) continue;
      rates.push({ tenant_id: tenantId, on_time_rate_pct: computeOnTimeRatePct(payments, 12) });
    }
    return rates;
  }
}
