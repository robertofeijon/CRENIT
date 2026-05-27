import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { DepositsService } from './deposits.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserProfileFromAuthHeader, assertKycApproved, assertRole, assertPartnerApproved } from '../supabase/supabase.utils';

@Controller('deposits')
export class DepositsController {
  constructor(
    private readonly depositsService: DepositsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('health')
  health() {
    return { success: true, data: { module: 'deposits' }, error: null };
  }

  @Get('me')
  async tenantDeposit(@Headers('authorization') authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'TENANT');
    const deposit = await this.depositsService.getTenantDeposit(profile.id);
    return { success: true, data: deposit, error: null };
  }

  @Get('landlord')
  async landlordDeposits(@Headers('authorization') authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    assertPartnerApproved(profile, 'Your landlord account is under review. Deposit collection is locked until approval.');
    const deposits = await this.depositsService.listLandlordDeposits(profile.id);
    return { success: true, data: deposits, error: null };
  }

  @Get(':depositId')
  async getDeposit(@Headers('authorization') authHeader: string, @Param('depositId') depositId: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    const role = profile.role?.toString().toUpperCase();
    if (!['TENANT', 'LANDLORD'].includes(role)) {
      throw new BadRequestException('Invalid role for deposit access');
    }
    const deposit = await this.depositsService.getDepositById(profile.id, depositId, role);
    return { success: true, data: deposit, error: null };
  }

  @Post('collect')
  async collect(
    @Headers('authorization') authHeader: string,
    @Body() body: { lease_id: string; amount: number },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    assertPartnerApproved(profile, 'Your landlord account is under review. Deposit actions are locked until approval.');
    if (!body?.lease_id || !body?.amount) {
      throw new BadRequestException('lease_id and amount are required');
    }
    const deposit = await this.depositsService.collectDeposit(profile.id, body);
    return { success: true, data: deposit, error: null };
  }

  @Post(':depositId/refund-request')
  async refundRequest(@Headers('authorization') authHeader: string, @Param('depositId') depositId: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    assertPartnerApproved(profile, 'Your landlord account is under review. Deposit actions are locked until approval.');
    const deposit = await this.depositsService.requestRefund(profile.id, depositId);
    return { success: true, data: deposit, error: null };
  }

  @Post(':depositId/release')
  async release(@Headers('authorization') authHeader: string, @Param('depositId') depositId: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    const deposit = await this.depositsService.releaseDeposit(profile.id, depositId);
    return { success: true, data: deposit, error: null };
  }
}
