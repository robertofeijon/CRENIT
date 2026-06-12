import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { brandTierFromScore100, brandTierProgress } from './tier-branding';

/** CRENIT rental credit model — score out of 100 */
export type CrenitRiskTier = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';

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

  async calculateScore(tenantId: string) {
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
      await client.from('score_history').insert([
        {
          tenant_id: tenantId,
          score: displayScore,
          tier,
          recorded_at: new Date().toISOString(),
          event_type: 'CALCULATED',
        },
      ]);
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

  async getScoreHistory(tenantId: string, limit = 12) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('score_history')
      .select('score, tier, recorded_at')
      .eq('tenant_id', tenantId)
      .order('recorded_at', { ascending: true })
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
    return data || [];
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

    return {
      score_100: score100,
      brand_tier: brand,
      tier_progress: progress,
      holding_back: holdingBack,
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
}
