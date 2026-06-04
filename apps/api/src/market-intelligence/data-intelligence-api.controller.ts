import {
  Controller,
  Get,
  Headers,
  Param,
  Query,
  Res,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { MarketIntelligenceService } from './market-intelligence.service';

@Controller('api/v1')
export class DataIntelligenceApiController {
  constructor(private readonly marketIntelligenceService: MarketIntelligenceService) {}

  private async resolveClient(apiKey: string | undefined) {
    if (!apiKey?.trim()) {
      throw new UnauthorizedException('X-CRENIT-Key header is required');
    }
    const keyRecord = await this.marketIntelligenceService.validateApiKey(apiKey.trim());
    if (!keyRecord) {
      throw new UnauthorizedException('Invalid or revoked API key');
    }
    if ((keyRecord as any).expired) {
      throw new UnauthorizedException('API key expired — contact CRENIT to renew');
    }
    const client = keyRecord.b2b_clients as { id: string; subscription_status: string; rate_limit_per_hour: number };
    if (client.subscription_status !== 'active') {
      throw new UnauthorizedException('Client subscription is not active');
    }
    const exceeded = await this.marketIntelligenceService.hasExceededTierLimit(client.id, (client as any).access_tier || 'Monthly subscription');
    if (exceeded) {
      throw new BadRequestException('Daily API tier limit reached');
    }
    return { keyRecord, client };
  }

  @Get('suburb/:name/trends')
  async getSuburbTrends(
    @Headers('x-crenit-key') crenitApiKey: string,
    @Headers('x-rentcredit-key') legacyApiKey: string,
    @Param('name') suburb: string,
  ) {
    const { client, keyRecord } = await this.resolveClient(crenitApiKey || legacyApiKey);
    const data = await this.marketIntelligenceService.getSuburbTrends(suburb);
    await this.marketIntelligenceService.logApiUsage(
      client.id,
      `/api/v1/suburb/${suburb}/trends`,
      200,
      (keyRecord as any)?.id,
    );
    return { success: true, data, error: null };
  }

  @Get('suburb/:name')
  async getSuburb(
    @Headers('x-crenit-key') crenitApiKey: string,
    @Headers('x-rentcredit-key') legacyApiKey: string,
    @Param('name') suburb: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { client, keyRecord } = await this.resolveClient(crenitApiKey || legacyApiKey);
    try {
      const data = await this.marketIntelligenceService.getSuburbDetail(suburb);
      await this.marketIntelligenceService.logApiUsage(client.id, `/api/v1/suburb/${suburb}`, 200, (keyRecord as any)?.id);
      return { success: true, data, error: null };
    } catch (e) {
      await this.marketIntelligenceService.logApiUsage(client.id, `/api/v1/suburb/${suburb}`, 404, (keyRecord as any)?.id);
      throw e;
    }
  }

  @Get('city-overview')
  async getCityOverview(@Headers('x-crenit-key') crenitApiKey: string, @Headers('x-rentcredit-key') legacyApiKey: string) {
    const { client, keyRecord } = await this.resolveClient(crenitApiKey || legacyApiKey);
    const data = await this.marketIntelligenceService.getCityOverview();
    await this.marketIntelligenceService.logApiUsage(client.id, '/api/v1/city-overview', 200, (keyRecord as any)?.id);
    return { success: true, data, error: null };
  }

  @Get('lender-risk/:suburb')
  async getLenderRisk(
    @Headers('x-crenit-key') crenitApiKey: string,
    @Headers('x-rentcredit-key') legacyApiKey: string,
    @Param('suburb') suburb: string,
  ) {
    const { client, keyRecord } = await this.resolveClient(crenitApiKey || legacyApiKey);
    const data = await this.marketIntelligenceService.getLenderRisk(suburb);
    await this.marketIntelligenceService.logApiUsage(client.id, `/api/v1/lender-risk/${suburb}`, 200, (keyRecord as any)?.id);
    return { success: true, data, error: null };
  }

  @Get('reports')
  async listReports(@Headers('x-crenit-key') crenitApiKey: string, @Headers('x-rentcredit-key') legacyApiKey: string) {
    const { client, keyRecord } = await this.resolveClient(crenitApiKey || legacyApiKey);
    const products = await this.marketIntelligenceService.getReportProducts();
    await this.marketIntelligenceService.logApiUsage(client.id, '/api/v1/reports', 200, (keyRecord as any)?.id);
    return {
      success: true,
      data: products.map((p) => ({
        report_type: p.report_type,
        display_name: p.display_name,
        description: p.description,
        price_nad: p.price_nad,
        requires_suburb: p.requires_suburb,
        deliverables: p.deliverables,
      })),
      error: null,
    };
  }

  @Get('reports/:reportType/preview')
  async previewReport(
    @Headers('x-crenit-key') crenitApiKey: string,
    @Headers('x-rentcredit-key') legacyApiKey: string,
    @Param('reportType') reportType: string,
    @Query('suburb') suburb?: string,
  ) {
    const { client, keyRecord } = await this.resolveClient(crenitApiKey || legacyApiKey);
    const data = await this.marketIntelligenceService.getReportPreview(reportType, suburb);
    await this.marketIntelligenceService.logApiUsage(
      client.id,
      `/api/v1/reports/${reportType}/preview`,
      200,
      (keyRecord as any)?.id,
    );
    return { success: true, data, error: null };
  }

  @Get('reports/:reportType/pdf')
  async downloadReportPdf(
    @Headers('x-crenit-key') crenitApiKey: string,
    @Headers('x-rentcredit-key') legacyApiKey: string,
    @Param('reportType') reportType: string,
    @Query('suburb') suburb: string | undefined,
    @Res() res: Response,
  ) {
    const { client, keyRecord } = await this.resolveClient(crenitApiKey || legacyApiKey);
    try {
      const pdf = await this.marketIntelligenceService.generateReportPdf(reportType, suburb, undefined, client.id);
      await this.marketIntelligenceService.logApiUsage(
        client.id,
        `/api/v1/reports/${reportType}/pdf`,
        200,
        (keyRecord as any)?.id,
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="crenit-${reportType}${suburb ? `-${suburb}` : ''}.pdf"`);
      res.send(pdf);
    } catch (e) {
      const status = (e as { status?: number }).status === 400 ? 400 : 404;
      await this.marketIntelligenceService.logApiUsage(
        client.id,
        `/api/v1/reports/${reportType}/pdf`,
        status,
        (keyRecord as any)?.id,
      );
      throw e;
    }
  }
}
