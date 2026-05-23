import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { LandlordsService } from './landlords.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserFromAuthHeader, getUserProfileFromAuthHeader, assertRole } from '../supabase/supabase.utils';

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
  async invite(
    @Headers('authorization') authHeader: string,
    @Body() body: { email: string; full_name: string; unit_id?: string },
  ) {
    try {
      const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
      assertRole(profile, 'LANDLORD');
      if (!body?.email || !body?.full_name) {
        throw new BadRequestException('email and full_name are required');
      }
      const result = await this.landlordsService.inviteTenant(profile.id, body);
      return { success: true, data: result, error: null };
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(error?.message || 'Unable to invite tenant.');
    }
  }

  @Get('leases')
  async listLeases(@Headers('authorization') authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    const leases = await this.landlordsService.listLeases(profile.id);
    return { success: true, data: leases, error: null };
  }

  @Get('leases/:leaseId')
  async getLease(@Headers('authorization') authHeader: string, @Param('leaseId') leaseId: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    const lease = await this.landlordsService.getLease(profile.id, leaseId);
    return { success: true, data: lease, error: null };
  }

  @Post('leases')
  async createLease(
    @Headers('authorization') authHeader: string,
    @Body()
    body: {
      tenant_id?: string;
      tenant_email?: string;
      unit_id: string;
      monthly_rent: number;
      start_date?: string;
      end_date?: string;
      status?: string;
    },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    if (!body?.unit_id || body.monthly_rent == null || (!body.tenant_id && !body.tenant_email)) {
      throw new BadRequestException('unit_id, monthly_rent, and tenant_id or tenant_email are required');
    }
    const lease = await this.landlordsService.createLease(profile.id, body);
    return { success: true, data: lease, error: null };
  }

  @Patch('leases/:leaseId')
  async updateLease(
    @Headers('authorization') authHeader: string,
    @Param('leaseId') leaseId: string,
    @Body()
    body: {
      monthly_rent?: number;
      start_date?: string;
      end_date?: string;
      status?: string;
    },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    const allowedStatuses = ['ACTIVE', 'ENDED', 'TERMINATED'];
    if (body.status && !allowedStatuses.includes(body.status)) {
      throw new BadRequestException('Invalid lease status');
    }
    const lease = await this.landlordsService.updateLease(profile.id, leaseId, body);
    return { success: true, data: lease, error: null };
  }

  @Delete('leases/:leaseId')
  async deleteLease(@Headers('authorization') authHeader: string, @Param('leaseId') leaseId: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    await this.landlordsService.deleteLease(profile.id, leaseId);
    return { success: true, data: { deleted: true }, error: null };
  }
}
