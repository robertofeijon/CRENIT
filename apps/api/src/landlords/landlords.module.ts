import { Module } from '@nestjs/common';
import { LandlordsController } from './landlords.controller';
import { LandlordsService } from './landlords.service';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';

@Module({
  controllers: [LandlordsController, AttachmentsController],
  providers: [LandlordsService, AttachmentsService],
  exports: [LandlordsService, AttachmentsService],
})
export class LandlordsModule {}
