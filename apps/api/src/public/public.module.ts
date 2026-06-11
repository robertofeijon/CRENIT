import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [NotificationsModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
