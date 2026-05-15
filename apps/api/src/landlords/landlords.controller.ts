import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { LandlordsService } from './landlords.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserFromAuthHeader } from '../supabase/supabase.utils';

@Controller('landlords')
export class LandlordsController {
  constructor(
    private readonly landlordsService: LandlordsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('health')
  health() {
    return { success: true, data: { module: 'landlords' }, error: null };
  }

  @Get('overview')
  async overview(@Headers('authorization') authHeader: string) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      const result = await this.landlordsService.buildOverview(user.id);
      return { success: true, data: result, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unauthorized');
    }
  }

  @Get('tenants')
  async listTenants(@Headers('authorization') authHeader: string) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      const result = await this.landlordsService.listTenants(user.id);
      return { success: true, data: result, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unauthorized');
    }
  }

  @Get('tenants/:tenantId')
  async getTenant(@Headers('authorization') authHeader: string, @Param('tenantId') tenantId: string) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      const result = await this.landlordsService.getTenantReview(user.id, tenantId);
      return { success: true, data: result, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unauthorized');
    }
  }

  @Patch('tenants/:tenantId/kyc')
  async updateTenantKyc(
    @Headers('authorization') authHeader: string,
    @Param('tenantId') tenantId: string,
    @Body() body: { status: string; reason?: string },
  ) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      if (!['APPROVED', 'REJECTED', 'PENDING', 'NOT_SUBMITTED'].includes(body.status)) {
        throw new BadRequestException('Invalid KYC status');
      }
      if (body.status === 'REJECTED' && !body.reason?.trim()) {
        throw new BadRequestException('Rejection reason is required when rejecting KYC');
      }
      const result = await this.landlordsService.updateTenantKycStatus(user.id, tenantId, body.status, body.reason?.trim());
      return { success: true, data: result, error: null };
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(error?.message || 'Unable to update KYC status.');
    }
  }

  @Post('invite')
  async invite(@Headers('authorization') authHeader: string, @Body() body: { email: string; full_name: string }) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      const role = (user.user_metadata as any)?.role?.toString().toUpperCase?.();
      if (role !== 'LANDLORD') {
        throw new UnauthorizedException('Only landlords can invite tenants');
      }
      if (!body?.email || !body?.full_name) {
        throw new BadRequestException('email and full_name are required');
      }
      const result = await this.landlordsService.inviteTenant(user.id, body);
      return { success: true, data: result, error: null };
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(error?.message || 'Unable to invite tenant.');
    }
  }
}
