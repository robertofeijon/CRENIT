import { Global, Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MarketIntelligenceModule } from '../market-intelligence/market-intelligence.module';
import { SchedulerHeartbeatService } from './scheduler-heartbeat.service';
import { CronInternalController } from './cron-internal.controller';

@Global()
@Module({
  imports: [PaymentsModule, NotificationsModule, MarketIntelligenceModule],
  controllers: [CronInternalController],
  providers: [SchedulerHeartbeatService],
  exports: [SchedulerHeartbeatService],
})
export class OpsModule {}
