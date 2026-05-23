import { Module } from '@nestjs/common';
import { DepositsController } from './deposits.controller';
import { DisputesController } from './disputes.controller';
import { AdminDisputesController } from './admin-disputes.controller';
import { DepositsService } from './deposits.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [DepositsController, DisputesController, AdminDisputesController],
  providers: [DepositsService],
  exports: [DepositsService],
})
export class DepositsModule {}
