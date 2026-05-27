import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserFromAuthHeader } from '../supabase/supabase.utils';

@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('health')
  health() {
    return { success: true, data: { module: 'tenants' }, error: null };
  }

  @Get('me')
  async me(@Headers('authorization') authHeader: string) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      const result = await this.tenantsService.buildDashboard(user.id);
      return { success: true, data: result, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unauthorized');
    }
  }

  @Get('payments')
  async payments(@Headers('authorization') authHeader: string) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      const result = await this.tenantsService.getPaymentHistory(user.id);
      return { success: true, data: result, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unauthorized');
    }
  }

  @Get('renewals')
  async renewals(@Headers('authorization') authHeader: string) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      const result = await this.tenantsService.listRenewals(user.id);
      return { success: true, data: result, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unauthorized');
    }
  }

  @Post('renewals/respond')
  async respondRenewal(
    @Headers('authorization') authHeader: string,
    @Body() body: { renewal_id: string; action: 'APPROVE' | 'REJECT' | 'COUNTER'; proposed_rent?: number; proposed_end_date?: string },
  ) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      const result = await this.tenantsService.respondToRenewal(user.id, body);
      return { success: true, data: result, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unauthorized');
    }
  }

  @Post('lease/payment-method-switch/request')
  async requestPaymentMethodSwitch(
    @Headers('authorization') authHeader: string,
    @Body() body: { requested_method: 'PLATFORM' | 'DIRECT' },
  ) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      const result = await this.tenantsService.requestPaymentMethodSwitch(user.id, body.requested_method);
      return { success: true, data: result, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unauthorized');
    }
  }

  @Post('lease/payment-method-switch/confirm')
  async confirmPaymentMethodSwitch(
    @Headers('authorization') authHeader: string,
    @Body() body: { request_id: string },
  ) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      const result = await this.tenantsService.confirmPaymentMethodSwitch(user.id, body.request_id);
      return { success: true, data: result, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unauthorized');
    }
  }

  @Get('lease/payment-method-switch/requests')
  async listPaymentMethodSwitchRequests(@Headers('authorization') authHeader: string) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      const result = await this.tenantsService.listPaymentMethodSwitchRequests(user.id);
      return { success: true, data: result, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unauthorized');
    }
  }
}
