import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { SchedulerHeartbeatService } from '../ops/scheduler-heartbeat.service';

@Injectable()
export class NotificationsSchedulerService {
  private readonly logger = new Logger(NotificationsSchedulerService.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly schedulerHeartbeat: SchedulerHeartbeatService,
  ) {}

  @Cron('0 8 * * *', { timeZone: 'Africa/Windhoek' })
  async handleRentDueReminderJob() {
    this.logger.log('Running rent due reminder job');
    try {
      await this.notificationsService.sendRentDueReminders();
      this.schedulerHeartbeat.record('notifications_rent_reminder', true);
    } catch (error) {
      this.schedulerHeartbeat.record('notifications_rent_reminder', false, (error as Error).message);
      this.logger.error('Rent due reminder job failed', error as any);
    }
  }

  @Cron('0 6 * * *', { timeZone: 'Africa/Windhoek' })
  async handleApiKeyExpiryJob() {
    this.logger.log('Running API key expiry alert job');
    try {
      await this.notificationsService.sendApiKeyExpiryAlerts();
      this.schedulerHeartbeat.record('notifications_api_key_expiry', true);
    } catch (error) {
      this.schedulerHeartbeat.record('notifications_api_key_expiry', false, (error as Error).message);
      this.logger.error('API key expiry alert job failed', error as any);
    }
  }

  @Cron('15 8 * * *', { timeZone: 'Africa/Windhoek' })
  async handleKycAndRenewalJobs() {
    this.logger.log('Running KYC and renewal reminder jobs');
    try {
      await this.notificationsService.sendKycLifecycleReminders();
      this.schedulerHeartbeat.record('notifications_kyc_reminder', true);
    } catch (error) {
      this.schedulerHeartbeat.record('notifications_kyc_reminder', false, (error as Error).message);
      this.logger.error('KYC reminder job failed', error as any);
    }

    try {
      await this.notificationsService.generateLeaseRenewalProposals();
      this.schedulerHeartbeat.record('notifications_lease_renewal', true);
    } catch (error) {
      this.schedulerHeartbeat.record('notifications_lease_renewal', false, (error as Error).message);
      this.logger.error('Lease renewal proposal job failed', error as any);
    }
  }
}
