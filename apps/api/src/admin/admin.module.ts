import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { LandlordsModule } from '../landlords/landlords.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { KycModule } from '../kyc/kyc.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [LandlordsModule, NotificationsModule, KycModule, TenantsModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
