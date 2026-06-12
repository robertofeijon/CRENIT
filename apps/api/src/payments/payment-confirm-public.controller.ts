import { Body, Controller, Get, Param, Post, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('public/payment-confirm')
export class PaymentConfirmPublicController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':token')
  async preview(@Param('token') token: string) {
    const data = await this.paymentsService.getPaymentConfirmPreview(token);
    return { success: true, data, error: null };
  }

  @Post(':token')
  async act(@Param('token') token: string, @Body() body: { action?: string; reason?: string }) {
    const action = body?.action === 'dispute' ? 'dispute' : body?.action === 'confirm' ? 'confirm' : null;
    if (!action) {
      throw new BadRequestException('action must be confirm or dispute');
    }
    const data = await this.paymentsService.actOnPaymentConfirmToken(token, action, body?.reason);
    return { success: true, data, error: null };
  }
}
