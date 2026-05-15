import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class CreditScoreService {
  private readonly logger = new Logger(CreditScoreService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private mapPaymentHistoryPctToScore(pct: number): number {
    if (pct >= 100) return 100;
    if (pct >= 80) return 70;
    if (pct >= 60) return 40;
    return 20;
  }

  private mapStreakToScore(streak: number): number {
    if (streak >= 12) return 100;
    if (streak >= 6) return 70;
    if (streak >= 3) return 50;
    if (streak >= 1) return 30;
    return 0;
  }

  private mapHistoryMonthsToScore(months: number): number {
    if (months >= 24) return 100;
    if (months >= 12) return 75;
    if (months >= 6) return 50;
    if (months >= 3) return 30;
    return 10;
  }

  private mapIncomeRentToScore(ratio: number): number {
    if (ratio >= 3.0) return 100;
    if (ratio >= 2.5) return 80;
    if (ratio >= 2.0) return 60;
    if (ratio >= 1.5) return 40;
    return 20;
  }

  private mapDepositStatusToScore(status: string | null): number {
    switch (status) {
      case 'REFUNDED':
        return 100;
      case 'HELD':
        return 80;
      case 'REFUND_PENDING':
        return 60;
      case 'DISPUTED':
        return 30;
      case 'FORFEITED':
        return 0;
      default:
        return 80;
    }
  }

  async calculateScore(tenantId: string) {
    const client = this.supabase.getClient();

    // 1. Fetch payments
    const { data: payments } = await client
      .from('payments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('due_date', { ascending: false });

    // 2. Fetch leases
    const { data: leases } = await client
      .from('leases')
      .select('*')
      .eq('tenant_id', tenantId);

    // 3. Fetch profile
    const { data: profiles } = await client
      .from('profiles')
      .select('*')
      .eq('id', tenantId)
      .limit(1);

    const profile = profiles && profiles[0] ? profiles[0] : null;

    // 4. Fetch deposits
    const { data: deposits } = await client
      .from('deposits')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    // Payment history score
    const totalDue = (payments || []).length;
    const paidOnTime = (payments || []).filter((p: any) => p.paid_date && new Date(p.paid_date) <= new Date(p.due_date)).length;
    const paymentHistoryPct = totalDue === 0 ? 100 : Math.round((paidOnTime / totalDue) * 100);
    const paymentHistoryScore = this.mapPaymentHistoryPctToScore(paymentHistoryPct);

    // Streak score: count consecutive on-time payments from most recent
    let streak = 0;
    if (payments && payments.length) {
      for (const p of payments) {
        if (p.paid_date && new Date(p.paid_date) <= new Date(p.due_date)) streak += 1;
        else break;
      }
    }
    const streakScore = this.mapStreakToScore(streak);

    // History length score
    let monthsActive = 0;
    if (leases && leases.length) {
      const earliest = leases.reduce((acc: any, l: any) => {
        const d = new Date(l.start_date);
        return !acc || d < acc ? d : acc;
      }, null as Date | null);
      if (earliest) {
        const now = new Date();
        monthsActive = Math.floor((now.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24 * 30));
      }
    }
    const historyLengthScore = this.mapHistoryMonthsToScore(monthsActive);

    // Income to rent ratio
    let incomeRentScore = 20;
    if (profile && leases && leases.length) {
      const activeLease = leases.find((l: any) => l.status === 'ACTIVE') || leases[0];
      if (activeLease && profile.income_monthly && activeLease.monthly_rent) {
        const ratio = Number(profile.income_monthly) / Number(activeLease.monthly_rent);
        incomeRentScore = this.mapIncomeRentToScore(ratio);
      }
    }

    // Deposit management
    const mostRecentDeposit = deposits && deposits.length ? deposits[0] : null;
    const depositScore = this.mapDepositStatusToScore(mostRecentDeposit ? mostRecentDeposit.status : null);

    // Composite weighted score
    const weighted =
      paymentHistoryScore * 0.35 +
      streakScore * 0.2 +
      historyLengthScore * 0.2 +
      incomeRentScore * 0.15 +
      depositScore * 0.1;

    const finalScore = Math.round(300 + (weighted / 100) * 600);

    const tier = finalScore >= 800 ? 'EXCELLENT' : finalScore >= 650 ? 'GOOD' : finalScore >= 500 ? 'FAIR' : 'BUILDING';

    // Persist: mark previous as not current and insert new
    await client.from('credit_scores').update({ is_current: false }).eq('tenant_id', tenantId).eq('is_current', true);

    const { data: inserted } = await client.from('credit_scores').insert([
      {
        tenant_id: tenantId,
        score: finalScore,
        tier,
        payment_history_score: paymentHistoryScore,
        streak_score: streakScore,
        history_length_score: historyLengthScore,
        income_rent_ratio_score: incomeRentScore,
        deposit_management_score: depositScore,
        is_current: true,
      },
    ]).select().limit(1);

    const scoreId = inserted && inserted[0] ? inserted[0].id : null;

    // Save factor breakdowns
    const factors = [
      { factor_name: 'payment_history', weight: 0.35, raw_value: paymentHistoryPct, weighted_contribution: paymentHistoryScore * 0.35 },
      { factor_name: 'streak', weight: 0.2, raw_value: streak, weighted_contribution: streakScore * 0.2 },
      { factor_name: 'history_length', weight: 0.2, raw_value: monthsActive, weighted_contribution: historyLengthScore * 0.2 },
      { factor_name: 'income_rent_ratio', weight: 0.15, raw_value: profile ? profile.income_monthly : null, weighted_contribution: incomeRentScore * 0.15 },
      { factor_name: 'deposit_management', weight: 0.1, raw_value: mostRecentDeposit ? mostRecentDeposit.status : null, weighted_contribution: depositScore * 0.1 },
    ];

    if (scoreId) {
      const inserts = factors.map((f) => ({ score_id: scoreId, ...f }));
      await client.from('credit_score_factors').insert(inserts);
    }

    this.logger.log(`Calculated score for ${tenantId}: ${finalScore} (${tier})`);

    return {
      tenantId,
      score: finalScore,
      tier,
      breakdown: {
        paymentHistoryScore,
        streakScore,
        historyLengthScore,
        incomeRentScore,
        depositScore,
      },
    };
  }
}
