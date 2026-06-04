import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MarketIntelligenceService } from './market-intelligence.service';

@Injectable()
export class MarketIntelligenceSchedulerService {
  private readonly logger = new Logger(MarketIntelligenceSchedulerService.name);

  constructor(private readonly marketIntelligenceService: MarketIntelligenceService) {}

  /** Roll verified payment records into market_data_snapshots for fast landlord reads. */
  @Cron('30 3 * * *', { timeZone: 'Africa/Windhoek' })
  async rollupNightlySnapshots() {
    try {
      const result = await this.marketIntelligenceService.rollupSnapshotsFromVerifiedRecords();
      this.logger.log(
        `Market snapshot rollup: ${result.rolled} rows (${result.snapshot_date ?? 'skipped'}) source=${result.data_source}`,
      );
    } catch (err) {
      this.logger.error('Market snapshot rollup failed', err as Error);
    }
  }
}
