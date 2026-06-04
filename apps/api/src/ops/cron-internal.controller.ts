import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentsSchedulerService } from '../payments/payments-scheduler.service';
import { NotificationsSchedulerService } from '../notifications/notifications-scheduler.service';
import { MarketIntelligenceSchedulerService } from '../market-intelligence/market-intelligence-scheduler.service';

const JOB_HANDLERS: Record<string, keyof CronInternalController> = {
  'payments-overdue': 'runPaymentsOverdue',
  'payments-autopay': 'runPaymentsAutopay',
  'credit-score-recalc': 'runCreditScoreRecalc',
  'notifications-rent-reminder': 'runRentReminder',
  'notifications-api-key-expiry': 'runApiKeyExpiry',
  'notifications-kyc-renewal': 'runKycRenewal',
  'mi-snapshot-rollup': 'runMiSnapshotRollup',
  'mi-licensable-webhooks': 'runMiLicensableWebhooks',
  'mi-webhook-retry': 'runMiWebhookRetry',
};

@Controller('internal/cron')
export class CronInternalController {
  constructor(
    private readonly paymentsScheduler: PaymentsSchedulerService,
    private readonly notificationsScheduler: NotificationsSchedulerService,
    private readonly miScheduler: MarketIntelligenceSchedulerService,
  ) {}

  private assertCronSecret(header?: string) {
    const expected = process.env.CRON_SECRET?.trim();
    if (!expected) {
      throw new ForbiddenException('CRON_SECRET is not configured on the API.');
    }
    if (!header || header !== expected) {
      throw new UnauthorizedException('Invalid cron secret');
    }
  }

  @Get('jobs')
  async listJobs(@Headers('x-cron-secret') secret: string) {
    this.assertCronSecret(secret);
    return {
      success: true,
      data: { jobs: Object.keys(JOB_HANDLERS) },
      error: null,
    };
  }

  @Post(':job')
  async runJob(@Headers('x-cron-secret') secret: string, @Param('job') job: string) {
    this.assertCronSecret(secret);
    const handler = JOB_HANDLERS[job];
    if (!handler) {
      return { success: false, data: null, error: `Unknown job: ${job}` };
    }
    await (this as any)[handler]();
    return { success: true, data: { job, ran_at: new Date().toISOString() }, error: null };
  }

  async runPaymentsOverdue() {
    await this.paymentsScheduler.handleOverdueUpdateJob();
  }

  async runPaymentsAutopay() {
    await this.paymentsScheduler.handleAutoPayJob();
  }

  async runCreditScoreRecalc() {
    await this.paymentsScheduler.handleNightlyScoreRecalculation();
  }

  async runRentReminder() {
    await this.notificationsScheduler.handleRentDueReminderJob();
  }

  async runApiKeyExpiry() {
    await this.notificationsScheduler.handleApiKeyExpiryJob();
  }

  async runKycRenewal() {
    await this.notificationsScheduler.handleKycAndRenewalJobs();
  }

  async runMiSnapshotRollup() {
    await this.miScheduler.rollupNightlySnapshots();
  }

  async runMiLicensableWebhooks() {
    await this.miScheduler.syncLicensableWebhooks();
  }

  async runMiWebhookRetry() {
    await this.miScheduler.retryFailedWebhooks();
  }
}
