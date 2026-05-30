import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsSchedulerService } from './notifications-scheduler.service';
import { EmailDeliveryService } from './email-delivery.service';
import { MarketIntelligenceModule } from '../market-intelligence/market-intelligence.module';

@Module({
  imports: [SupabaseModule, MarketIntelligenceModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsSchedulerService, EmailDeliveryService],
  exports: [NotificationsService, EmailDeliveryService],
})
export class NotificationsModule {}
