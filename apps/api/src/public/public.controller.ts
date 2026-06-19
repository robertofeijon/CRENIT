import { Body, Controller, Get, Post, BadRequestException } from '@nestjs/common';
import { PublicService } from './public.service';
import { MarketIntelligenceService } from '../market-intelligence/market-intelligence.service';

@Controller('public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly marketIntelligence: MarketIntelligenceService,
  ) {}

  @Post('contact')
  async contact(@Body() body: { name?: string; email?: string; subject?: string; message?: string }) {
    if (!body) throw new BadRequestException('Request body is required');
    const result = await this.publicService.submitContact({
      name: body.name || '',
      email: body.email || '',
      subject: body.subject || '',
      message: body.message || '',
    });
    return { success: true, data: result, error: null };
  }

  @Post('waitlist')
  async waitlist(@Body() body: { email?: string; full_name?: string; suburb?: string }) {
    const result = await this.publicService.joinWaitlist({
      email: body.email || '',
      full_name: body.full_name,
      suburb: body.suburb || '',
    });
    return { success: true, data: result, error: null };
  }

  @Get('market-intelligence/dashboard')
  async marketIntelligenceDashboard() {
    const data = await this.marketIntelligence.getPublicMarketDashboard();
    return { success: true, data, error: null };
  }

  @Post('market-intelligence/sample-key')
  async marketIntelligenceSampleKey(@Body() body: { email?: string; company_name?: string }) {
    const result = await this.publicService.requestB2bSampleKey({
      email: body.email || '',
      company_name: body.company_name,
    });
    return { success: true, data: result, error: null };
  }
}
