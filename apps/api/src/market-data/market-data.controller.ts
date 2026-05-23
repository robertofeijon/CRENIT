import { Controller, Get, Param } from '@nestjs/common';
import { MarketDataService } from './market-data.service';

@Controller('market-data')
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get('health')
  health() {
    return { success: true, data: { module: 'market-data' }, error: null };
  }

  @Get('suburbs')
  async getSuburbs() {
    const data = await this.marketDataService.getSuburbs();
    return { success: true, data, error: null };
  }

  @Get('suburbs/:suburb')
  async getSuburbDetails(@Param('suburb') suburb: string) {
    const data = await this.marketDataService.getSuburbDetails(suburb);
    return { success: true, data, error: null };
  }

  @Get('summary')
  async getSummary() {
    const data = await this.marketDataService.getSummary();
    return { success: true, data, error: null };
  }

  @Get('snapshot/:suburb/:date')
  async getSnapshot(@Param('suburb') suburb: string, @Param('date') date: string) {
    const data = await this.marketDataService.getSnapshot(suburb, date);
    return { success: true, data, error: null };
  }
}
