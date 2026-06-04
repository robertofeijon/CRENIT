import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { parseIntelligenceFilters } from './market-intelligence.utils';
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

  @Get('commercial-catalog')
  async commercialCatalog(@Headers('authorization') authHeader: string) {
    await this.assertAdmin(authHeader);
    const catalog = await this.marketIntelligenceService.getCommercialCatalog();
    const products = await this.marketIntelligenceService.getReportProducts();
    return { success: true, data: { ...catalog, products }, error: null };
  }

  @Get('filter-options')
  async filterOptions(@Headers('authorization') authHeader: string) {
    await this.assertAdmin(authHeader);
    const data = await this.marketIntelligenceService.getFilterOptions();
    return { success: true, data, error: null };
  }

  @Get('dashboard')
  async dashboard(
    @Headers('authorization') authHeader: string,
    @Query('timeframe') timeframe?: string,
    @Query('city') city?: string,
    @Query('suburb') suburb?: string,
    @Query('property_type') property_type?: string,
    @Query('bedrooms') bedrooms?: string,
    @Query('payment_status') payment_status?: string,
  ) {
    await this.assertAdmin(authHeader);
    const filters = parseIntelligenceFilters({ timeframe, city, suburb, property_type, bedrooms, payment_status });
    const data = await this.marketIntelligenceService.getDashboardOverview(filters);
    return { success: true, data, error: null };
  }

  @Get('platform-health')
  async platformHealth(
    @Headers('authorization') authHeader: string,
    @Query('timeframe') timeframe?: string,
    @Query('city') city?: string,
    @Query('suburb') suburb?: string,
    @Query('property_type') property_type?: string,
    @Query('bedrooms') bedrooms?: string,
    @Query('payment_status') payment_status?: string,
  ) {
    await this.assertAdmin(authHeader);
    const filters = parseIntelligenceFilters({ timeframe, city, suburb, property_type, bedrooms, payment_status });
    const data = await this.marketIntelligenceService.getPlatformHealth(filters);
    return { success: true, data, error: null };
  }

  @Get('suburbs')
  async suburbs(
    @Headers('authorization') authHeader: string,
    @Query('timeframe') timeframe?: string,
    @Query('city') city?: string,
    @Query('suburb') suburb?: string,
    @Query('property_type') property_type?: string,
    @Query('bedrooms') bedrooms?: string,
    @Query('payment_status') payment_status?: string,
  ) {
    await this.assertAdmin(authHeader);
    const filters = parseIntelligenceFilters({ timeframe, city, suburb, property_type, bedrooms, payment_status });
    const data = await this.marketIntelligenceService.getSuburbExplorer(filters);
    return { success: true, data, error: null };
  }

  @Get('suburbs/:suburb')
  async suburbDetail(
    @Headers('authorization') authHeader: string,
    @Param('suburb') suburb: string,
    @Query('timeframe') timeframe?: string,
    @Query('city') city?: string,
    @Query('property_type') property_type?: string,
    @Query('bedrooms') bedrooms?: string,
    @Query('payment_status') payment_status?: string,
  ) {
    await this.assertAdmin(authHeader);
    const filters = parseIntelligenceFilters({ timeframe, city, suburb, property_type, bedrooms, payment_status });
    const data = await this.marketIntelligenceService.getSuburbDetail(decodeURIComponent(suburb), filters);
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
    res.setHeader('Content-Disposition', `attachment; filename="crenit-${body.report_type}.pdf"`);
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

  @Get('licensable-suburbs')
  async licensableSuburbs(@Headers('authorization') authHeader: string) {
    await this.assertAdmin(authHeader);
    const data = await this.marketIntelligenceService.getLicensableSuburbsReport();
    return { success: true, data, error: null };
  }

  @Post('snapshots/rollup')
  async rollupSnapshots(@Headers('authorization') authHeader: string) {
    await this.assertAdmin(authHeader);
    const data = await this.marketIntelligenceService.rollupSnapshotsFromVerifiedRecords();
    return { success: true, data, error: null };
  }

  @Get('integrator/openapi.json')
  async integratorOpenApi(@Headers('authorization') authHeader: string, @Res() res: Response) {
    await this.assertAdmin(authHeader);
    const doc = this.marketIntelligenceService.getOpenApiDocument();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="crenit-data-intelligence-openapi.json"');
    res.send(doc);
  }

  @Get('integrator/postman.json')
  async integratorPostman(@Headers('authorization') authHeader: string, @Res() res: Response) {
    await this.assertAdmin(authHeader);
    const collection = this.marketIntelligenceService.getPostmanCollection();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="crenit-data-intelligence.postman_collection.json"');
    res.send(collection);
  }

  @Post('webhooks/sync-licensable')
  async syncLicensableWebhooks(@Headers('authorization') authHeader: string) {
    await this.assertAdmin(authHeader);
    const data = await this.marketIntelligenceService.syncLicensableSuburbWebhooks();
    return { success: true, data, error: null };
  }

  @Post('b2b-clients/:clientId/webhooks')
  async registerClientWebhook(
    @Headers('authorization') authHeader: string,
    @Param('clientId') clientId: string,
    @Body() body: { url: string; events?: string[] },
  ) {
    await this.assertAdmin(authHeader);
    if (!body?.url?.trim()) throw new BadRequestException('url is required');
    const data = await this.marketIntelligenceService.registerB2bWebhook(clientId, body.url.trim(), body.events);
    return { success: true, data, error: null };
  }

  @Get('b2b-clients/:clientId/webhooks')
  async listClientWebhooks(@Headers('authorization') authHeader: string, @Param('clientId') clientId: string) {
    await this.assertAdmin(authHeader);
    const data = await this.marketIntelligenceService.listB2bWebhooks(clientId);
    return { success: true, data, error: null };
  }

  @Delete('b2b-clients/:clientId/webhooks/:subscriptionId')
  async deactivateClientWebhook(
    @Headers('authorization') authHeader: string,
    @Param('clientId') clientId: string,
    @Param('subscriptionId') subscriptionId: string,
  ) {
    await this.assertAdmin(authHeader);
    const data = await this.marketIntelligenceService.deactivateB2bWebhook(clientId, subscriptionId);
    return { success: true, data, error: null };
  }

  @Post('webhooks/:subscriptionId/test')
  async testWebhookDelivery(
    @Headers('authorization') authHeader: string,
    @Param('subscriptionId') subscriptionId: string,
  ) {
    await this.assertAdmin(authHeader);
    const data = await this.marketIntelligenceService.sendWebhookTestDelivery(subscriptionId);
    return { success: true, data, error: null };
  }

  @Get('webhooks/deliveries')
  async listWebhookDeliveries(@Headers('authorization') authHeader: string, @Query('limit') limit?: string) {
    await this.assertAdmin(authHeader);
    const data = await this.marketIntelligenceService.listWebhookDeliveries(
      limit ? Math.min(100, Math.max(1, Number(limit))) : 50,
    );
    return { success: true, data, error: null };
  }

  @Get('licensable-watch')
  async licensableWatch(@Headers('authorization') authHeader: string) {
    await this.assertAdmin(authHeader);
    const data = await this.marketIntelligenceService.getLicensableSuburbWatchState();
    return { success: true, data, error: null };
  }

  @Post('sale-comps/ingest')
  async ingestSaleComps(
    @Headers('authorization') authHeader: string,
    @Body()
    body: {
      partner_client_id?: string;
      records: Array<{
        suburb: string;
        city?: string;
        sale_price: number;
        transfer_date: string;
        property_type?: string;
        bedrooms?: number;
        price_per_sqm?: number;
        source_type?: string;
      }>;
    },
  ) {
    await this.assertAdmin(authHeader);
    const data = await this.marketIntelligenceService.ingestSaleCompsPilot(body.partner_client_id ?? null, body.records ?? []);
    return { success: true, data, error: null };
  }

  @Get('sale-comps/:suburb')
  async saleCompsSuburb(@Headers('authorization') authHeader: string, @Param('suburb') suburb: string) {
    await this.assertAdmin(authHeader);
    const data = await this.marketIntelligenceService.getSaleCompsForSuburb(decodeURIComponent(suburb));
    return { success: true, data, error: null };
  }

  @Get('methodology/pdf')
  async methodologyPdf(@Headers('authorization') authHeader: string, @Res() res: Response) {
    const profile = await this.assertAdmin(authHeader);
    const pdf = await this.marketIntelligenceService.generateMethodologyPdf(profile.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="crenit-data-intelligence-methodology.pdf"');
    res.send(pdf);
  }
}
