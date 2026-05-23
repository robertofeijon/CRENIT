import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { MarketIntelligenceModule } from '../market-intelligence/market-intelligence.module';

@Module({
  imports: [SupabaseModule, MarketIntelligenceModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
