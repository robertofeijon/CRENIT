import {
  Controller,
  Get,
  Headers,
  Param,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { MarketIntelligenceService } from './market-intelligence.service';

@Controller('api/v1')
export class DataIntelligenceApiController {
  constructor(private readonly marketIntelligenceService: MarketIntelligenceService) {}

  private async resolveClient(apiKey: string | undefined) {
    if (!apiKey?.trim()) {
      throw new UnauthorizedException('X-RentCredit-Key header is required');
    }
    const keyRecord = await this.marketIntelligenceService.validateApiKey(apiKey.trim());
    if (!keyRecord) {
      throw new UnauthorizedException('Invalid or revoked API key');
    }
    const client = keyRecord.b2b_clients as { id: string; subscription_status: string; rate_limit_per_hour: number };
    if (client.subscription_status !== 'active') {
      throw new UnauthorizedException('Client subscription is not active');
    }
    return { keyRecord, client };
  }

  @Get('suburb/:name')
  async getSuburb(
    @Headers('x-rentcredit-key') apiKey: string,
    @Param('name') suburb: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { client } = await this.resolveClient(apiKey);
    try {
      const data = await this.marketIntelligenceService.getSuburbDetail(suburb);
      await this.marketIntelligenceService.logApiUsage(client.id, `/api/v1/suburb/${suburb}`, 200);
      return { success: true, data, error: null };
    } catch (e) {
      await this.marketIntelligenceService.logApiUsage(client.id, `/api/v1/suburb/${suburb}`, 404);
      throw e;
    }
  }

  @Get('city-overview')
  async getCityOverview(@Headers('x-rentcredit-key') apiKey: string) {
    const { client } = await this.resolveClient(apiKey);
    const data = await this.marketIntelligenceService.getCityOverview();
    await this.marketIntelligenceService.logApiUsage(client.id, '/api/v1/city-overview', 200);
    return { success: true, data, error: null };
  }

  @Get('lender-risk/:suburb')
  async getLenderRisk(@Headers('x-rentcredit-key') apiKey: string, @Param('suburb') suburb: string) {
    const { client } = await this.resolveClient(apiKey);
    const data = await this.marketIntelligenceService.getLenderRisk(suburb);
    await this.marketIntelligenceService.logApiUsage(client.id, `/api/v1/lender-risk/${suburb}`, 200);
    return { success: true, data, error: null };
  }
}
