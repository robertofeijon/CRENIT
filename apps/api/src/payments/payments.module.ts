import { Module } from '@nestjs/common';
import { PaymentSimulatorService } from './payment-simulator.service';
import { PaymentsController } from './payments.controller';
import { LandlordPaymentsController } from './landlord-payments.controller';
import { PaymentsService } from './payments.service';
import { CreditScoreModule } from '../credit-score/credit-score.module';

@Module({
  imports: [CreditScoreModule],
  controllers: [PaymentsController, LandlordPaymentsController],
  providers: [PaymentsService, PaymentSimulatorService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
