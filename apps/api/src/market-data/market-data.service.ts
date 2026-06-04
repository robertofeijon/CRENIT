import { Injectable, NotFoundException } from '@nestjs/common';
import { MarketIntelligenceService } from '../market-intelligence/market-intelligence.service';

/** Landlord portal + legacy routes — backed by verified intelligence pipeline (same as B2B). */
@Injectable()
export class MarketDataService {
  constructor(private readonly marketIntelligence: MarketIntelligenceService) {}

  async getSuburbs() {
    return this.marketIntelligence.getPortalSuburbs();
  }

  async getSuburbDetails(suburb: string) {
    const detail = await this.marketIntelligence.getPortalSuburbDetail(suburb);
    if (!detail) {
      throw new NotFoundException(`Suburb data not found for ${suburb}`);
    }
    return detail;
  }

  async getSummary() {
    return this.marketIntelligence.getPortalSummary();
  }

  async getSnapshot(suburb: string, snapshotDate: string) {
    return this.marketIntelligence.getSnapshotByDate(suburb, snapshotDate);
  }

  async compareUnitRent(
    landlordUserId: string,
    opts: { unitId?: string; suburb?: string; rentAmount?: number },
  ) {
    return this.marketIntelligence.getPortalLandlordRentCompare(landlordUserId, opts);
  }

  async getSaleCompsForSuburb(suburb: string) {
    return this.marketIntelligence.getSaleCompsForSuburb(suburb);
  }
}
