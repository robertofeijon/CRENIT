import { Controller, Get } from '@nestjs/common';
import { DepositsService } from './deposits.service';

@Controller('deposits')
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Get('health')
  health() {
    return { success: true, data: { module: 'deposits' }, error: null };
  }
}
