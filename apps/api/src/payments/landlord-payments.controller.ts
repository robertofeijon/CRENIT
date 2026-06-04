import { Controller, Get, Post, Param, Query, Headers, BadRequestException, Body } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserProfileFromAuthHeader, assertRole, assertPartnerApproved } from '../supabase/supabase.utils';

@Controller('landlords/payments')
export class LandlordPaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get()
  async list(
    @Headers('authorization') authHeader: string,
    @Query('property_unit_id') unitId?: string,
    @Query('status') status?: string,
    @Query('payment_method') paymentMethod?: string,
    @Query('month') month?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    assertPartnerApproved(profile, 'Your landlord account is under review. Payment confirmations are locked until approval.');

    const pageNumber = Number(page) || 1;
    const pageSize = Number(limit) || 20;

    if (status && !['PAID', 'PENDING', 'OVERDUE', 'FAILED', 'PROCESSING'].includes(status.toUpperCase())) {
      throw new BadRequestException('Invalid status filter');
    }

    const response = await this.paymentsService.getLandlordPayments(profile.id, {
      propertyUnitId: unitId,
      status: status?.toUpperCase(),
      month,
      paymentMethod: paymentMethod?.toUpperCase(),
      page: pageNumber,
      limit: pageSize,
    });

    return { success: true, data: response, error: null };
  }

  @Get(':paymentId/eft-proof')
  async eftProof(@Headers('authorization') authHeader: string, @Param('paymentId') paymentId: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    assertPartnerApproved(profile, 'Your landlord account is under review. Payment confirmations are locked until approval.');
    if (!paymentId) {
      throw new BadRequestException('paymentId is required');
    }
    const result = await this.paymentsService.getEftProofSignedUrlForLandlord(profile.id, paymentId);
    return { success: true, data: result, error: null };
  }

  @Post(':paymentId/confirm')
  async confirm(
    @Headers('authorization') authHeader: string,
    @Param('paymentId') paymentId: string,
    @Body() body: { received_date?: string; amount?: number },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    assertPartnerApproved(profile, 'Your landlord account is under review. Payment confirmations are locked until approval.');

    if (!paymentId) {
      throw new BadRequestException('paymentId is required');
    }

    const payment = await this.paymentsService.confirmLandlordPayment(profile.id, paymentId, body || {});
    return { success: true, data: payment, error: null };
  }
}
