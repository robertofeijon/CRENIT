import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsSchedulerService {
  private readonly logger = new Logger(NotificationsSchedulerService.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Cron('0 8 * * *', { timeZone: 'Africa/Windhoek' })
  async handleRentDueReminderJob() {
    this.logger.log('Running rent due reminder job');
    try {
      await this.notificationsService.sendRentDueReminders();
    } catch (error) {
      this.logger.error('Rent due reminder job failed', error as any);
    }
  }

  @Cron('0 6 * * *', { timeZone: 'Africa/Windhoek' })
  async handleApiKeyExpiryJob() {
    this.logger.log('Running API key expiry alert job');
    try {
      await this.notificationsService.sendApiKeyExpiryAlerts();
    } catch (error) {
      this.logger.error('API key expiry alert job failed', error as any);
    }
  }

  @Cron('15 8 * * *', { timeZone: 'Africa/Windhoek' })
  async handleKycAndRenewalJobs() {
    this.logger.log('Running KYC and renewal reminder jobs');
    try {
      await this.notificationsService.sendKycLifecycleReminders();
    } catch (error) {
      this.logger.error('KYC reminder job failed', error as any);
    }

    try {
      await this.notificationsService.generateLeaseRenewalProposals();
    } catch (error) {
      this.logger.error('Lease renewal proposal job failed', error as any);
    }
  }
}
