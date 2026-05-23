import { Module } from '@nestjs/common';
import { PaymentSimulatorService } from './payment-simulator.service';
import { PaymentsController } from './payments.controller';
import { LandlordPaymentsController } from './landlord-payments.controller';
import { PaymentsSchedulerService } from './payments-scheduler.service';
import { PaymentsService } from './payments.service';
import { CreditScoreModule } from '../credit-score/credit-score.module';
import { MarketIntelligenceModule } from '../market-intelligence/market-intelligence.module';

@Module({
  imports: [CreditScoreModule, MarketIntelligenceModule],
  controllers: [PaymentsController, LandlordPaymentsController],
  providers: [PaymentsService, PaymentSimulatorService, PaymentsSchedulerService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
