import { Controller, Get, Post, Query, BadRequestException, Headers, UnauthorizedException } from '@nestjs/common';
import { CreditScoreService } from './credit-score.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserFromAuthHeader } from '../supabase/supabase.utils';

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
  async me(@Headers('authorization') authHeader: string, @Query('tenantId') tenantId: string) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
    if (user.id !== tenantId) {
      throw new UnauthorizedException('Tenant mismatch');
    }
    const result = await this.creditScoreService.calculateScore(tenantId);
    return { success: true, data: result, error: null };
  }

  @Post('recalculate')
  async recalculate(@Headers('authorization') authHeader: string, @Query('tenantId') tenantId: string) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
    if (user.id !== tenantId) {
      throw new UnauthorizedException('Tenant mismatch');
    }
    const result = await this.creditScoreService.calculateScore(tenantId);
    return { success: true, data: result, error: null };
  }
}
