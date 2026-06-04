import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MarketIntelligenceService } from './market-intelligence.service';
import { SchedulerHeartbeatService } from '../ops/scheduler-heartbeat.service';

@Injectable()
export class MarketIntelligenceSchedulerService {
  private readonly logger = new Logger(MarketIntelligenceSchedulerService.name);

  constructor(
    private readonly marketIntelligenceService: MarketIntelligenceService,
    private readonly schedulerHeartbeat: SchedulerHeartbeatService,
  ) {}

  /** Roll verified payment records into market_data_snapshots for fast landlord reads. */
  @Cron('30 3 * * *', { timeZone: 'Africa/Windhoek' })
  async rollupNightlySnapshots() {
    try {
      const result = await this.marketIntelligenceService.rollupSnapshotsFromVerifiedRecords();
      this.schedulerHeartbeat.record('mi_snapshot_rollup', true);
      this.logger.log(
        `Market snapshot rollup: ${result.rolled} rows (${result.snapshot_date ?? 'skipped'}) source=${result.data_source}`,
      );
    } catch (err) {
      this.schedulerHeartbeat.record('mi_snapshot_rollup', false, (err as Error).message);
      this.logger.error('Market snapshot rollup failed', err as Error);
    }
  }

  @Cron('0 4 * * *', { timeZone: 'Africa/Windhoek' })
  async syncLicensableWebhooks() {
    try {
      const result = await this.marketIntelligenceService.syncLicensableSuburbWebhooks();
      this.schedulerHeartbeat.record('mi_licensable_webhooks', true);
      this.logger.log(`Licensable suburb webhooks: ${result.newly_licensable} newly licensable`);
    } catch (err) {
      this.schedulerHeartbeat.record('mi_licensable_webhooks', false, (err as Error).message);
      this.logger.error('Licensable suburb webhook sync failed', err as Error);
    }
  }

  @Cron('*/15 * * * *', { timeZone: 'Africa/Windhoek' })
  async retryFailedWebhooks() {
    try {
      const result = await this.marketIntelligenceService.retryWebhookDeliveries();
      this.schedulerHeartbeat.record('mi_webhook_retry', true);
      if (result.retried > 0) {
        this.logger.log(`Webhook retries: ${result.retried} attempted, ${result.succeeded} succeeded`);
      }
    } catch (err) {
      this.schedulerHeartbeat.record('mi_webhook_retry', false, (err as Error).message);
      this.logger.error('Webhook retry job failed', err as Error);
    }
  }
}
