import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CreditScoreModule } from './credit-score/credit-score.module';
import { DepositsModule } from './deposits/deposits.module';
import { KycModule } from './kyc/kyc.module';
import { LandlordsModule } from './landlords/landlords.module';
import { MarketDataModule } from './market-data/market-data.module';
import { PaymentsModule } from './payments/payments.module';
import { PropertiesModule } from './properties/properties.module';
import { ReportsModule } from './reports/reports.module';
import { SupabaseModule } from './supabase/supabase.module';
import { TenantsModule } from './tenants/tenants.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    SupabaseModule,
    AuthModule,
    KycModule,
    LandlordsModule,
    PropertiesModule,
    TenantsModule,
    PaymentsModule,
    DepositsModule,
    CreditScoreModule,
    ReportsModule,
    MarketDataModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
