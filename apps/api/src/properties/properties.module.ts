import { Module } from '@nestjs/common';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { PublicModule } from '../public/public.module';

@Module({
  imports: [SupabaseModule, PublicModule],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
