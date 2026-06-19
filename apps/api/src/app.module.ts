import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
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
import { MarketIntelligenceModule } from './market-intelligence/market-intelligence.module';
import { PaymentsModule } from './payments/payments.module';
import { PropertiesModule } from './properties/properties.module';
import { ReportsModule } from './reports/reports.module';
import { SupabaseModule } from './supabase/supabase.module';
import { TenantsModule } from './tenants/tenants.module';
import { SettingsModule } from './settings/settings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OpsModule } from './ops/ops.module';
import { PublicModule } from './public/public.module';
import { FraudDetectionModule } from './fraud-detection/fraud-detection.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(process.cwd(), '.env'), join(process.cwd(), '../../.env')],
    }),
    ScheduleModule.forRoot(),
    OpsModule,
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
    MarketIntelligenceModule,
    AdminModule,
    SettingsModule,
    NotificationsModule,
    PublicModule,
    FraudDetectionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
