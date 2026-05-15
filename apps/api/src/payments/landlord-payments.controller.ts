import { Controller, Get, Query, Headers, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserProfileFromAuthHeader, assertRole } from '../supabase/supabase.utils';

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
    @Query('month') month?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');

    const pageNumber = Number(page) || 1;
    const pageSize = Number(limit) || 20;

    if (status && !['PAID', 'PENDING', 'OVERDUE', 'FAILED', 'PROCESSING'].includes(status.toUpperCase())) {
      throw new BadRequestException('Invalid status filter');
    }

    const response = await this.paymentsService.getLandlordPayments(profile.id, {
      propertyUnitId: unitId,
      status: status?.toUpperCase(),
      month,
      page: pageNumber,
      limit: pageSize,
    });

    return { success: true, data: response, error: null };
  }
}
