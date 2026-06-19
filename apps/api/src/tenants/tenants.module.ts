import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { PaymentHistoryImportService } from './payment-history-import.service';
import { CreditScoreModule } from '../credit-score/credit-score.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [CreditScoreModule, NotificationsModule],
  controllers: [TenantsController],
  providers: [TenantsService, PaymentHistoryImportService],
  exports: [TenantsService, PaymentHistoryImportService],
})
export class TenantsModule {}
