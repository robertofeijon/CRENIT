import { Module } from '@nestjs/common';
import { ConsentController } from './consent.controller';
import { ConsentService } from './consent.service';
import { DataIntelligenceApiController } from './data-intelligence-api.controller';
import { MarketIntelligenceAdminController } from './market-intelligence-admin.controller';
import { MarketIntelligenceCaptureService } from './market-intelligence-capture.service';
import { MarketIntelligenceService } from './market-intelligence.service';

@Module({
  controllers: [MarketIntelligenceAdminController, DataIntelligenceApiController, ConsentController],
  providers: [MarketIntelligenceService, MarketIntelligenceCaptureService, ConsentService],
  exports: [MarketIntelligenceCaptureService, ConsentService, MarketIntelligenceService],
})
export class MarketIntelligenceModule {}
