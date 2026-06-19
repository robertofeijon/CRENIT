import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { OpsModule } from '../ops/ops.module';
import { FraudDetectionService } from './fraud-detection.service';
import { FraudDetectionController } from './fraud-detection.controller';
import { FraudDetectionSchedulerService } from './fraud-detection-scheduler.service';

@Module({
  imports: [SupabaseModule, OpsModule],
  controllers: [FraudDetectionController],
  providers: [FraudDetectionService, FraudDetectionSchedulerService],
  exports: [FraudDetectionService],
})
export class FraudDetectionModule {}
