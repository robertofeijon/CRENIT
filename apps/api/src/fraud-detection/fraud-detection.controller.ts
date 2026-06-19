import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { FraudDetectionService, type FraudFlagStatus } from './fraud-detection.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserProfileFromAuthHeader, assertRole } from '../supabase/supabase.utils';

@Controller('admin/fraud')
export class FraudDetectionController {
  constructor(
    private readonly fraudDetection: FraudDetectionService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('flags')
  async listFlags(@Headers('authorization') authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const flags = await this.fraudDetection.listActiveFlags();
    return { success: true, data: flags, error: null };
  }

  @Post('scan')
  async scan(@Headers('authorization') authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const result = await this.fraudDetection.runDetectionScan(profile.id);
    return { success: true, data: result, error: null };
  }

  @Post('flags/:flagId/status')
  async updateStatus(
    @Headers('authorization') authHeader: string,
    @Param('flagId') flagId: string,
    @Body() body: { status: FraudFlagStatus; resolution_note?: string },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    if (!body?.status) {
      throw new BadRequestException('status is required');
    }
    const flag = await this.fraudDetection.transitionFlag(profile.id, flagId, body.status, body.resolution_note);
    return { success: true, data: flag, error: null };
  }
}
