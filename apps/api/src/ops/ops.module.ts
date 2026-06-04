import { Global, Module } from '@nestjs/common';
import { SchedulerHeartbeatService } from './scheduler-heartbeat.service';

@Global()
@Module({
  providers: [SchedulerHeartbeatService],
  exports: [SchedulerHeartbeatService],
})
export class OpsModule {}
