import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PaymentsService } from './payments.service';
import { CreditScoreService } from '../credit-score/credit-score.service';
import { SchedulerHeartbeatService } from '../ops/scheduler-heartbeat.service';

@Injectable()
export class PaymentsSchedulerService {
  private readonly logger = new Logger(PaymentsSchedulerService.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly creditScoreService: CreditScoreService,
    private readonly schedulerHeartbeat: SchedulerHeartbeatService,
  ) {}

  @Cron('0 9 * * *', { timeZone: 'Africa/Windhoek' })
  async handleOverdueUpdateJob() {
    this.logger.log('Running overdue payment status update job');
    try {
      await this.paymentsService.recordOverduePayments();
      this.schedulerHeartbeat.record('payments_overdue', true);
    } catch (error) {
      this.schedulerHeartbeat.record('payments_overdue', false, (error as Error).message);
      this.logger.error('Daily overdue payment status update failed', error as any);
    }
  }

  @Cron('0 7 * * *', { timeZone: 'Africa/Windhoek' })
  async handleAutoPayJob() {
    this.logger.log('Running auto-pay processing job');
    try {
      await this.paymentsService.processAutoPayments();
      this.schedulerHeartbeat.record('payments_autopay', true);
    } catch (error) {
      this.schedulerHeartbeat.record('payments_autopay', false, (error as Error).message);
      this.logger.error('Daily auto-pay processing failed', error as any);
    }
  }

  @Cron('0 2 * * *', { timeZone: 'Africa/Windhoek' })
  async handleNightlyScoreRecalculation() {
    this.logger.log('Running nightly tenant credit score recalculation for recent payment updates');
    try {
      await this.creditScoreService.calculateScoresForRecentPaymentUpdates(24);
      this.schedulerHeartbeat.record('credit_score_recalc', true);
    } catch (error) {
      this.schedulerHeartbeat.record('credit_score_recalc', false, (error as Error).message);
      this.logger.error('Nightly credit score recalculation failed', error as any);
    }
  }
}
