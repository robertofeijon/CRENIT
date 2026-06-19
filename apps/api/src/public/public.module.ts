import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { MarketIntelligenceModule } from '../market-intelligence/market-intelligence.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [NotificationsModule, SupabaseModule, MarketIntelligenceModule],
  controllers: [PublicController],
  providers: [PublicService],
  exports: [PublicService],
})
export class PublicModule {}
