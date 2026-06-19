import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { PaymentHistoryImportService } from './payment-history-import.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserFromAuthHeader } from '../supabase/supabase.utils';

@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly paymentHistoryImportService: PaymentHistoryImportService,
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

  @Post('bring-landlord')
  async bringLandlord(
    @Headers('authorization') authHeader: string,
    @Body() body: { landlord_email?: string; landlord_name?: string; suburb?: string; message?: string },
  ) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      const result = await this.tenantsService.bringLandlord(user.id, {
        landlord_email: body.landlord_email || '',
        landlord_name: body.landlord_name,
        suburb: body.suburb,
        message: body.message,
        tenant_email: user.email,
      });
      return { success: true, data: result, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unauthorized');
    }
  }

  @Get('payment-history-imports')
  async listPaymentHistoryImports(@Headers('authorization') authHeader: string) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      const result = await this.paymentHistoryImportService.listImportsForTenant(user.id);
      return { success: true, data: result, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unauthorized');
    }
  }

  @Post('payment-history-imports')
  async submitPaymentHistoryImport(
    @Headers('authorization') authHeader: string,
    @Body() body: { lease_id?: string; csv_text?: string; source_filename?: string },
  ) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      const result = await this.paymentHistoryImportService.submitImport(user.id, {
        lease_id: body.lease_id || '',
        csv_text: body.csv_text || '',
        source_filename: body.source_filename,
      });
      return { success: true, data: result, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unauthorized');
    }
  }
}
