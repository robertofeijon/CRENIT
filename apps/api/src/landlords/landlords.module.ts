import { Module } from '@nestjs/common';
import { LandlordsController } from './landlords.controller';
import { LandlordsService } from './landlords.service';
import { LeaseDocumentService } from './lease-document.service';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [LandlordsController, AttachmentsController],
  providers: [LandlordsService, LeaseDocumentService, AttachmentsService],
  exports: [LandlordsService, LeaseDocumentService, AttachmentsService],
})
export class LandlordsModule {}
