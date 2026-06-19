import { Body, Controller, Get, Post, Headers, UnauthorizedException } from '@nestjs/common';
import { CreditScoreService } from './credit-score.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserProfileFromAuthHeader, assertRole } from '../supabase/supabase.utils';
import { buildPaymentMetrics } from '../payments/payment-metrics.util';

@Controller('credit-score')
export class CreditScoreController {
  constructor(
    private readonly creditScoreService: CreditScoreService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('health')
  health() {
    return { success: true, data: { module: 'credit-score' }, error: null };
  }

  @Get('me')
  async me(@Headers('authorization') authHeader: string) {
    try {
      const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
      assertRole(profile, 'TENANT');
      const client = this.supabaseService.getClient();
      const { data: payments } = await client
        .from('payments')
        .select('status, due_date, paid_date, days_overdue')
        .eq('tenant_id', profile.id)
        .order('due_date', { ascending: false });
      const paymentMetrics = buildPaymentMetrics(payments || []);
      const result = await this.creditScoreService.getCurrentScoreDetails(profile.id);
      const enriched = this.creditScoreService.enrichWithBrandTier(result);
      const milestone = this.creditScoreService.getMilestoneGuidance(result.score);
      return { success: true, data: { ...enriched, milestone, paymentMetrics }, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unable to load credit score');
    }
  }

  @Get('history')
  async history(@Headers('authorization') authHeader: string) {
    try {
      const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
      assertRole(profile, 'TENANT');
      const history = await this.creditScoreService.getScoreHistory(profile.id);
      return { success: true, data: history, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unable to load score history');
    }
  }

  @Post('recalculate')
  async recalculate(@Headers('authorization') authHeader: string) {
    try {
      const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
      assertRole(profile, 'TENANT');
      const result = await this.creditScoreService.calculateScore(profile.id, { event_type: 'MANUAL_RECALC' });
      const milestone = this.creditScoreService.getMilestoneGuidance(result.score);
      return { success: true, data: { ...result, milestone }, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unable to recalculate score');
    }
  }

  @Get('insights')
  async insights(@Headers('authorization') authHeader: string) {
    try {
      const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
      assertRole(profile, 'TENANT');
      const data = await this.creditScoreService.getInsights(profile.id);
      return { success: true, data, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unable to load score insights');
    }
  }

  @Post('simulate')
  async simulate(@Headers('authorization') authHeader: string, @Body() body: { months_on_time?: number }) {
    try {
      const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
      assertRole(profile, 'TENANT');
      const data = await this.creditScoreService.simulateScore(profile.id, Number(body?.months_on_time ?? 0));
      return { success: true, data, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unable to simulate score');
    }
  }

  @Post('recalculate-all')
  async recalculateAll(@Headers('authorization') authHeader: string) {
    try {
      const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
      assertRole(profile, 'ADMIN');
      const result = await this.creditScoreService.calculateAllScores();
      return { success: true, data: result, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unable to recalculate all scores');
    }
  }
}
