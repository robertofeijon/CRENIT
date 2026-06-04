import { Module, forwardRef } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConsentController } from './consent.controller';
import { ConsentService } from './consent.service';
import { DataIntelligenceApiController } from './data-intelligence-api.controller';
import { MarketIntelligenceAdminController } from './market-intelligence-admin.controller';
import { MarketIntelligenceCaptureService } from './market-intelligence-capture.service';
import { MarketIntelligenceSchedulerService } from './market-intelligence-scheduler.service';
import { MarketIntelligenceWebhookService } from './market-intelligence-webhook.service';
import { LandlordLicensableNotifyService } from './landlord-licensable-notify.service';
import { MarketIntelligenceService } from './market-intelligence.service';

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  controllers: [MarketIntelligenceAdminController, DataIntelligenceApiController, ConsentController],
  providers: [
    MarketIntelligenceService,
    MarketIntelligenceCaptureService,
    MarketIntelligenceSchedulerService,
    MarketIntelligenceWebhookService,
    LandlordLicensableNotifyService,
    ConsentService,
  ],
  exports: [
    MarketIntelligenceCaptureService,
    ConsentService,
    MarketIntelligenceService,
    MarketIntelligenceSchedulerService,
  ],
})
export class MarketIntelligenceModule {}
