import { Controller, Get, Headers, Param, Query, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { assertRole, getUserProfileFromAuthHeader } from '../supabase/supabase.utils';
import { MarketDataService } from './market-data.service';

@Controller('market-data')
export class MarketDataController {
  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private async assertLandlordOrAdmin(authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    if (!profile) throw new UnauthorizedException('Unauthorized');
    if (profile.role !== 'LANDLORD' && profile.role !== 'ADMIN') {
      throw new UnauthorizedException('Landlord or admin access required');
    }
    return profile;
  }

  @Get('health')
  health() {
    return { success: true, data: { module: 'market-data' }, error: null };
  }

  @Get('suburbs')
  async getSuburbs(@Headers('authorization') authHeader: string) {
    await this.assertLandlordOrAdmin(authHeader);
    const portal = await this.marketDataService.getSuburbs();
    return {
      success: true,
      data: portal.suburbs,
      meta: {
        data_source: portal.data_source,
        data_source_label: portal.data_source_label,
      },
      error: null,
    };
  }

  @Get('suburbs/:suburb/sale-comps')
  async getSuburbSaleComps(@Headers('authorization') authHeader: string, @Param('suburb') suburb: string) {
    await this.assertLandlordOrAdmin(authHeader);
    const data = await this.marketDataService.getSaleCompsForSuburb(suburb);
    return { success: true, data, error: null };
  }

  @Get('suburbs/:suburb')
  async getSuburbDetails(@Headers('authorization') authHeader: string, @Param('suburb') suburb: string) {
    await this.assertLandlordOrAdmin(authHeader);
    const data = await this.marketDataService.getSuburbDetails(suburb);
    return { success: true, data, error: null };
  }

  @Get('summary')
  async getSummary(@Headers('authorization') authHeader: string) {
    await this.assertLandlordOrAdmin(authHeader);
    const data = await this.marketDataService.getSummary();
    return { success: true, data, error: null };
  }

  @Get('licensable-alerts')
  async getLicensableAlerts(@Headers('authorization') authHeader: string) {
    const profile = await this.assertLandlordOrAdmin(authHeader);
    const data = await this.marketDataService.getLicensableAlerts(profile.id);
    return { success: true, data, error: null };
  }

  @Get('compare')
  async compareRent(
    @Headers('authorization') authHeader: string,
    @Query('unit_id') unitId?: string,
    @Query('suburb') suburb?: string,
    @Query('rent_amount') rentAmount?: string,
  ) {
    const profile = await this.assertLandlordOrAdmin(authHeader);
    const data = await this.marketDataService.compareUnitRent(profile.id, {
      unitId,
      suburb,
      rentAmount: rentAmount != null ? Number(rentAmount) : undefined,
    });
    return { success: true, data, error: null };
  }

  @Get('snapshot/:suburb/:date')
  async getSnapshot(
    @Headers('authorization') authHeader: string,
    @Param('suburb') suburb: string,
    @Param('date') date: string,
  ) {
    await this.assertLandlordOrAdmin(authHeader);
    const data = await this.marketDataService.getSnapshot(suburb, date);
    return { success: true, data, error: null };
  }
}
