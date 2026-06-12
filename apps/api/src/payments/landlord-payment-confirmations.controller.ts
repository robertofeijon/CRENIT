import { Body, Controller, Get, Headers, Post, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserProfileFromAuthHeader, assertRole, assertPartnerApproved } from '../supabase/supabase.utils';

@Controller('landlords/payment-confirmations')
export class LandlordPaymentConfirmationsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('pending')
  async pending(@Headers('authorization') authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    assertPartnerApproved(profile, 'Your landlord account is under review. Payment confirmations are locked until approval.');
    const data = await this.paymentsService.getPendingConfirmationsSummary(profile.id);
    return { success: true, data, error: null };
  }

  @Post('bulk-confirm')
  async bulkConfirm(@Headers('authorization') authHeader: string, @Body() body: { payment_ids?: string[] }) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    assertPartnerApproved(profile, 'Your landlord account is under review. Payment confirmations are locked until approval.');
    const ids = body?.payment_ids || [];
    if (!ids.length) {
      throw new BadRequestException('payment_ids is required');
    }
    const data = await this.paymentsService.bulkConfirmLandlordPayments(profile.id, ids);
    return { success: true, data, error: null };
  }
}
