import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentsService } from './payments.service';
import { CreditScoreService } from '../credit-score/credit-score.service';

@Injectable()
export class PaymentsSchedulerService {
  private readonly logger = new Logger(PaymentsSchedulerService.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly creditScoreService: CreditScoreService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyPaymentTasks() {
    this.logger.log('Running daily payment tasks: overdue status update and auto-pay processing');
    try {
      await this.paymentsService.recordOverduePayments();
    } catch (error) {
      this.logger.error('Daily overdue payment status update failed', error as any);
    }

    try {
      await this.paymentsService.processAutoPayments();
    } catch (error) {
      this.logger.error('Daily auto-pay processing failed', error as any);
    }
  }

  @Cron('0 0 1 * *')
  async handleMonthlyScoreRecalculation() {
    this.logger.log('Running monthly tenant credit score recalculation');
    try {
      await this.creditScoreService.calculateAllScores();
    } catch (error) {
      this.logger.error('Monthly credit score recalculation failed', error as any);
    }
  }
}
