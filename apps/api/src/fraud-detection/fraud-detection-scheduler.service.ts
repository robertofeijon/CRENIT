import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FraudDetectionService } from './fraud-detection.service';
import { SchedulerHeartbeatService } from '../ops/scheduler-heartbeat.service';

@Injectable()
export class FraudDetectionSchedulerService {
  private readonly logger = new Logger(FraudDetectionSchedulerService.name);

  constructor(
    private readonly fraudDetection: FraudDetectionService,
    private readonly schedulerHeartbeat: SchedulerHeartbeatService,
  ) {}

  /** Daily scan for confirm-rate anomalies and self-dealing IP patterns. */
  @Cron('0 5 * * *', { timeZone: 'Africa/Windhoek' })
  async handleDailyFraudScan() {
    this.logger.log('Running daily fraud pattern detection scan');
    try {
      const result = await this.fraudDetection.runDetectionScan();
      this.schedulerHeartbeat.record('fraud_detection_scan', true);
      this.logger.log(
        `Fraud scan complete — ${result.total_new} new flag(s) (${result.confirm_rate_flags} confirm-rate, ${result.self_dealing_flags} self-dealing)`,
      );
    } catch (error) {
      this.schedulerHeartbeat.record('fraud_detection_scan', false, (error as Error).message);
      this.logger.error('Daily fraud detection scan failed', error as any);
    }
  }
}
