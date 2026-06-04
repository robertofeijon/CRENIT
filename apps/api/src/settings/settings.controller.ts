import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserProfileFromAuthHeader, assertRole } from '../supabase/supabase.utils';

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('tenant')
  async getTenant(@Headers('authorization') authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'TENANT');
    const data = await this.settingsService.getTenantSettings(profile.id);
    return { success: true, data, error: null };
  }

  @Patch('profile')
  async updateProfile(@Headers('authorization') authHeader: string, @Body() body: Record<string, unknown>) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    const updated = await this.settingsService.updateProfile(profile.id, body);
    return { success: true, data: updated, error: null };
  }

  @Get('payment-methods')
  async listPaymentMethods(@Headers('authorization') authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    const settings = await this.settingsService.getTenantSettings(profile.id);
    return { success: true, data: settings.payment_methods, error: null };
  }

  @Post('payment-methods')
  async addPaymentMethod(
    @Headers('authorization') authHeader: string,
    @Body() body: { type: 'CARD' | 'MOBILE_MONEY' | 'EFT'; details: Record<string, unknown>; is_default?: boolean },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    if (!body?.type || !body?.details) {
      throw new BadRequestException('type and details are required');
    }
    const method = await this.settingsService.addPaymentMethod(profile.id, body);
    return { success: true, data: method, error: null };
  }

  @Delete('payment-methods/:methodId')
  async deletePaymentMethod(@Headers('authorization') authHeader: string, @Param('methodId') methodId: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    const result = await this.settingsService.deletePaymentMethod(profile.id, methodId);
    return { success: true, data: result, error: null };
  }

  @Get('landlord')
  async getLandlord(@Headers('authorization') authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    const data = await this.settingsService.getLandlordSettings(profile.id);
    return { success: true, data, error: null };
  }

  @Patch('landlord')
  async updateLandlord(
    @Headers('authorization') authHeader: string,
    @Body() body: { profile?: Record<string, unknown>; payout?: Record<string, unknown> },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    const data = await this.settingsService.updateLandlordSettings(profile.id, body);
    return { success: true, data, error: null };
  }

  @Patch('notifications')
  async updateNotifications(
    @Headers('authorization') authHeader: string,
    @Body()
    body: {
      email_enabled?: boolean;
      sms_enabled?: boolean;
      rent_reminders?: boolean;
      payment_confirmations?: boolean;
      kyc_updates?: boolean;
      lease_events?: boolean;
      deposit_events?: boolean;
      market_intelligence_alerts?: boolean;
    },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    if (body.sms_enabled && process.env.SMS_ENABLED !== 'true') {
      throw new BadRequestException('SMS notifications are currently disabled.');
    }
    const data = await this.settingsService.updateNotificationPreferences(profile.id, body);
    return { success: true, data, error: null };
  }
}
