import { Module } from '@nestjs/common';
import { PaymentSimulatorService } from './payment-simulator.service';
import { PaymentsController } from './payments.controller';
import { LandlordPaymentsController } from './landlord-payments.controller';
import { LandlordPaymentConfirmationsController } from './landlord-payment-confirmations.controller';
import { PaymentConfirmPublicController } from './payment-confirm-public.controller';
import { PaymentConfirmTokenService } from './payment-confirm-token.service';
import { PaymentsSchedulerService } from './payments-scheduler.service';
import { PaymentsService } from './payments.service';
import { CreditScoreModule } from '../credit-score/credit-score.module';
import { MarketIntelligenceModule } from '../market-intelligence/market-intelligence.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [CreditScoreModule, MarketIntelligenceModule, NotificationsModule],
  controllers: [
    PaymentsController,
    LandlordPaymentsController,
    LandlordPaymentConfirmationsController,
    PaymentConfirmPublicController,
  ],
  providers: [PaymentsService, PaymentSimulatorService, PaymentsSchedulerService, PaymentConfirmTokenService],
  exports: [PaymentsService, PaymentsSchedulerService],
})
export class PaymentsModule {}
