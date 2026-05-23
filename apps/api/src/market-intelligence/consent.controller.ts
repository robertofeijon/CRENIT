import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserProfileFromAuthHeader } from '../supabase/supabase.utils';
import { ConsentService, ConsentType } from './consent.service';

@Controller('consent')
export class ConsentController {
  constructor(
    private readonly consentService: ConsentService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('market-intelligence')
  async getConsents(@Headers('authorization') authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    if (!profile) throw new UnauthorizedException('Unauthorized');
    const consents = await this.consentService.getConsents(profile.id);
    return { success: true, data: consents, error: null };
  }

  @Post('market-intelligence')
  async grantConsent(
    @Headers('authorization') authHeader: string,
    @Body() body: { consent_type: ConsentType; terms_version?: string },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    if (!profile) throw new UnauthorizedException('Unauthorized');
    const record = await this.consentService.grantConsent(profile.id, body.consent_type, body.terms_version ?? '1.0');
    return { success: true, data: record, error: null };
  }
}
