import { Controller, Get, Post, Body, Param, Headers, BadRequestException } from '@nestjs/common';
import { DepositsService } from './deposits.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserProfileFromAuthHeader, assertRole } from '../supabase/supabase.utils';

@Controller('admin/disputes')
export class AdminDisputesController {
  constructor(
    private readonly depositsService: DepositsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('pending')
  async getPending(@Headers('authorization') authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');

    const disputes = await this.depositsService.listPendingAdminDisputes();
    return { success: true, data: { disputes }, error: null };
  }

  @Get('analytics')
  async getAnalytics(@Headers('authorization') authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const analytics = await this.depositsService.getDisputeOutcomeAnalytics();
    return { success: true, data: analytics, error: null };
  }

  @Post(':disputeId/arbitrate')
  async arbitrate(
    @Headers('authorization') authHeader: string,
    @Param('disputeId') disputeId: string,
    @Body() body: { decision: 'tenant_wins' | 'landlord_wins' | 'split'; amount_to_tenant: number; reason: string },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');

    if (!body.reason || typeof body.amount_to_tenant !== 'number') {
      throw new BadRequestException('decision, amount_to_tenant, and reason are required');
    }

    await this.depositsService.adminArbitrate(profile.id, disputeId, body.decision, body.amount_to_tenant, body.reason);
    return { success: true, data: { message: 'Arbitration decision recorded' }, error: null };
  }
}
