import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreditScoreService } from '../credit-score/credit-score.service';

@Injectable()
export class TenantsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly creditScoreService: CreditScoreService,
  ) {}

  async getTenantProfile(userId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client.from('profiles').select('*').eq('id', userId).single();
    if (error || !data) {
      throw new NotFoundException('Tenant profile not found');
    }
    return data;
  }

  async getActiveLease(userId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('leases')
      .select('*, units(*)')
      .eq('tenant_id', userId)
      .eq('status', 'ACTIVE')
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return data;
  }

  async getCurrentScore(userId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('credit_scores')
      .select('*')
      .eq('tenant_id', userId)
      .eq('is_current', true)
      .order('calculation_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return null;
    }
    return data;
  }

  async getLatestReport(userId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('credit_reports')
      .select('*')
      .eq('tenant_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return null;
    }
    return data;
  }

  async getRecentPayments(userId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('payments')
      .select('*')
      .eq('tenant_id', userId)
      .order('due_date', { ascending: false })
      .limit(5);

    if (error) {
      throw error;
    }
    return data || [];
  }

  async getPaymentHistory(userId: string, monthsBack = 12) {
    const client = this.supabase.getClient();
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - monthsBack);
    const dateString = twelveMonthsAgo.toISOString().slice(0, 10);

    const { data, error } = await client
      .from('payments')
      .select('*')
      .eq('tenant_id', userId)
      .gte('paid_date', dateString)
      .order('paid_date', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }
    return data || [];
  }

  async getUpcomingPayments(userId: string) {
    const client = this.supabase.getClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await client
      .from('payments')
      .select('*')
      .eq('tenant_id', userId)
      .neq('status', 'PAID')
      .gte('due_date', today)
      .order('due_date', { ascending: true })
      .limit(3);

    if (error) {
      throw error;
    }
    return data || [];
  }

  async getDepositStatus(userId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('deposits')
      .select('*')
      .eq('tenant_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return null;
    }
    return data;
  }

  async buildDashboard(userId: string) {
    const [profile, activeLease, currentScore, latestReport, recentPayments, upcomingPayments, deposit] = await Promise.all([
      this.getTenantProfile(userId),
      this.getActiveLease(userId),
      this.getCurrentScore(userId),
      this.getLatestReport(userId),
      this.getRecentPayments(userId),
      this.getUpcomingPayments(userId),
      this.getDepositStatus(userId),
    ]);

    const score = currentScore || (await this.creditScoreService.calculateScore(userId));
    const formattedScore = score
      ? {
          score: score.score,
          tier: score.tier,
          updatedAt: score.calculation_date ?? score.generated_at ?? new Date().toISOString(),
        }
      : null;

    return {
      profile,
      activeLease,
      score: formattedScore,
      latestReport,
      recentPayments,
      upcomingPayments,
      deposit,
    };
  }
}
