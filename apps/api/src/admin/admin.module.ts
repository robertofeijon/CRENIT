import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { LandlordsModule } from '../landlords/landlords.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { KycModule } from '../kyc/kyc.module';

@Module({
  imports: [LandlordsModule, NotificationsModule, KycModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
