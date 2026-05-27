import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserProfileFromAuthHeader, assertRole } from '../supabase/supabase.utils';
import { MarketIntelligenceService } from './market-intelligence.service';

@Controller('admin/data-intelligence')
export class MarketIntelligenceAdminController {
  constructor(
    private readonly marketIntelligenceService: MarketIntelligenceService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private async assertAdmin(authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    if (!profile) throw new UnauthorizedException('Unauthorized');
    assertRole(profile, 'ADMIN');
    return profile;
  }

  @Get('health')
  async health(@Headers('authorization') authHeader: string) {
    await this.assertAdmin(authHeader);
    return { success: true, data: { module: 'data-intelligence' }, error: null };
  }

  @Get('platform-health')
  async platformHealth(@Headers('authorization') authHeader: string) {
    await this.assertAdmin(authHeader);
    const data = await this.marketIntelligenceService.getPlatformHealth();
    return { success: true, data, error: null };
  }

  @Get('suburbs')
  async suburbs(@Headers('authorization') authHeader: string) {
    await this.assertAdmin(authHeader);
    const data = await this.marketIntelligenceService.getSuburbExplorer();
    return { success: true, data, error: null };
  }

  @Get('suburbs/:suburb')
  async suburbDetail(@Headers('authorization') authHeader: string, @Param('suburb') suburb: string) {
    await this.assertAdmin(authHeader);
    const data = await this.marketIntelligenceService.getSuburbDetail(decodeURIComponent(suburb));
    return { success: true, data, error: null };
  }

  @Get('report-products')
  async reportProducts(@Headers('authorization') authHeader: string) {
    await this.assertAdmin(authHeader);
    const data = await this.marketIntelligenceService.getReportProducts();
    return { success: true, data, error: null };
  }

  @Put('report-products/:reportType/price')
  async updatePrice(
    @Headers('authorization') authHeader: string,
    @Param('reportType') reportType: string,
    @Body() body: { price_nad: number },
  ) {
    await this.assertAdmin(authHeader);
    const data = await this.marketIntelligenceService.updateReportPrice(reportType, Number(body.price_nad));
    return { success: true, data, error: null };
  }

  @Get('reports/preview')
  async previewReport(
    @Headers('authorization') authHeader: string,
    @Query('report_type') reportType: string,
    @Query('suburb') suburb?: string,
  ) {
    await this.assertAdmin(authHeader);
    if (!reportType) throw new BadRequestException('report_type is required');
    const data = await this.marketIntelligenceService.getReportPreview(reportType, suburb);
    return { success: true, data, error: null };
  }

  @Post('reports/generate')
  async generateReport(
    @Headers('authorization') authHeader: string,
    @Body() body: { report_type: string; suburb?: string },
    @Res() res: Response,
  ) {
    const profile = await this.assertAdmin(authHeader);
    if (!body.report_type) throw new BadRequestException('report_type is required');
    const pdf = await this.marketIntelligenceService.generateReportPdf(body.report_type, body.suburb, profile.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rentcredit-${body.report_type}.pdf"`);
    res.send(pdf);
  }

  @Get('b2b-clients')
  async b2bClients(@Headers('authorization') authHeader: string) {
    await this.assertAdmin(authHeader);
    const data = await this.marketIntelligenceService.getB2bClients();
    return { success: true, data, error: null };
  }

  @Post('b2b-clients/:clientId/api-keys')
  async createApiKey(
    @Headers('authorization') authHeader: string,
    @Param('clientId') clientId: string,
    @Body() body: { label?: string; expires_in_days?: 30 | 90 | 365 },
  ) {
    await this.assertAdmin(authHeader);
    const expiresInDays = body.expires_in_days && [30, 90, 365].includes(body.expires_in_days) ? body.expires_in_days : 90;
    const data = await this.marketIntelligenceService.createApiKey(clientId, body.label, expiresInDays);
    return { success: true, data, error: null };
  }

  @Post('api-keys/:keyId/rotate')
  async rotateKey(
    @Headers('authorization') authHeader: string,
    @Param('keyId') keyId: string,
    @Body() body: { client_id: string; label?: string },
  ) {
    await this.assertAdmin(authHeader);
    if (!body.client_id) throw new BadRequestException('client_id is required');
    const data = await this.marketIntelligenceService.rotateApiKeyWithGrace(keyId, body.client_id, body.label);
    return { success: true, data, error: null };
  }

  @Post('api-keys/:keyId/revoke')
  async revokeKey(@Headers('authorization') authHeader: string, @Param('keyId') keyId: string) {
    await this.assertAdmin(authHeader);
    const data = await this.marketIntelligenceService.revokeApiKey(keyId);
    return { success: true, data, error: null };
  }

  @Get('api-config')
  async apiConfig(@Headers('authorization') authHeader: string) {
    await this.assertAdmin(authHeader);
    const data = await this.marketIntelligenceService.getApiConfig();
    return { success: true, data, error: null };
  }
}
