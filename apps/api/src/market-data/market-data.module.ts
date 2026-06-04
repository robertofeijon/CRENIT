import { Module } from '@nestjs/common';
import { MarketIntelligenceModule } from '../market-intelligence/market-intelligence.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';

@Module({
  imports: [MarketIntelligenceModule, SupabaseModule],
  controllers: [MarketDataController],
  providers: [MarketDataService],
  exports: [MarketDataService],
})
export class MarketDataModule {}
