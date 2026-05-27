import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { LandlordsModule } from '../landlords/landlords.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [LandlordsModule, NotificationsModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
