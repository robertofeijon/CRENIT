import { Module } from '@nestjs/common';
import { CreditScoreController } from './credit-score.controller';
import { CreditScoreService } from './credit-score.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [CreditScoreController],
  providers: [CreditScoreService],
  exports: [CreditScoreService],
})
export class CreditScoreModule {}
