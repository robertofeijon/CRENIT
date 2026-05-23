import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  health() {
    return {
      success: true,
      data: { status: 'ok', service: this.appService.getServiceName() },
      error: null,
    };
  }
}
