import { Controller, Get, Post, Body, BadRequestException, Logger, Headers, Req, UnauthorizedException, Query, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { PaymentsService } from './payments.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserProfileFromAuthHeader, assertKycApproved } from '../supabase/supabase.utils';
import * as crypto from 'crypto';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('health')
  health() {
    return { success: true, data: { module: 'payments' }, error: null };
  }

  @Post('initiate')
  async initiate(
    @Headers('authorization') authHeader: string,
    @Body()
    body: {
      property_unit_id: string;
      lease_id?: string;
      amount: number;
      payment_method: 'EFT' | 'CARD' | 'MOBILE_MONEY';
      payment_details: Record<string, any>;
    },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertKycApproved(profile);

    if (!body || !body.amount || !body.payment_method || !body.property_unit_id) {
      throw new BadRequestException('property_unit_id, amount and payment_method are required');
    }

    const result = await this.paymentsService.initiatePayment(profile.id, body);
    return { success: true, data: result, error: null };
  }

  @Get('history')
  async history(
    @Headers('authorization') authHeader: string,
    @Query('limit') limit = '12',
    @Query('offset') offset = '0',
    @Query('year') year?: string,
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertKycApproved(profile);

    const result = await this.paymentsService.getTenantPaymentHistory(profile.id, {
      limit: Number(limit) || 12,
      offset: Number(offset) || 0,
      year: year ? Number(year) : undefined,
    });

    return { success: true, data: result, error: null };
  }

  @Get('receipt/:paymentId')
  async receipt(
    @Headers('authorization') authHeader: string,
    @Param('paymentId') paymentId: string,
    @Res() res: Response,
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertKycApproved(profile);
    await this.paymentsService.sendReceiptPdf(profile.id, paymentId, res);
  }

  @Get('upcoming')
  async upcoming(@Headers('authorization') authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertKycApproved(profile);
    const result = await this.paymentsService.getUpcomingPayments(profile.id);
    return { success: true, data: result, error: null };
  }

  @Post('auto-pay/setup')
  async setupAutoPay(
    @Headers('authorization') authHeader: string,
    @Body() body: { enabled: boolean; payment_method_id: string; pay_day_offset?: number },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertKycApproved(profile);
    if (!body.payment_method_id) {
      throw new BadRequestException('payment_method_id is required');
    }

    const result = await this.paymentsService.setupAutoPay(profile.id, body.payment_method_id, Number(body.pay_day_offset) || 1);
    return { success: true, data: result, error: null };
  }

  @Post('auto-pay/cancel')
  async cancelAutoPay(@Headers('authorization') authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertKycApproved(profile);
    const result = await this.paymentsService.cancelAutoPay(profile.id);
    return { success: true, data: result, error: null };
  }

  @Post('record')
  async record(
    @Headers('authorization') authHeader: string,
    @Body() body: { tenant_id?: string; lease_id?: string; amount: number; paid_date?: string; payment_method?: string },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertKycApproved(profile);
    if (!body || !body.amount) throw new BadRequestException('amount is required');
    const payload = {
      tenant_id: body.tenant_id || profile.id,
      lease_id: body.lease_id,
      amount: body.amount,
      paid_date: body.paid_date,
      payment_method: body.payment_method,
    } as { tenant_id: string; lease_id?: string; amount: number; paid_date?: string; payment_method?: string };

    const res = await this.paymentsService.recordPayment(payload);
    return { success: true, data: res, error: null };
  }

  @Post('webhook')
  async webhook(@Body() body: any, @Headers() headers: Record<string, any>, @Req() req: any) {
    const sigHeader = (headers['x-webhook-signature'] || headers['x-signature'] || headers['stripe-signature']) as string | undefined;
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    const payloadString = req && req.rawBody ? req.rawBody : JSON.stringify(body);

    if (process.env.NODE_ENV === 'production' && !secret) {
      throw new UnauthorizedException('PAYMENT_WEBHOOK_SECRET is required in production');
    }

    if (secret) {
      if (!sigHeader) {
        throw new UnauthorizedException('Missing webhook signature');
      }
      const computed = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
      const expected = Buffer.from(computed, 'utf8');
      const received = Buffer.from(sigHeader, 'utf8');
      if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    if (!body || !body.type || !body.data) {
      throw new BadRequestException('invalid webhook payload');
    }

    this.logger.log(`Received webhook type=${body.type}`);
    const eventId = body.id || headers['x-event-id'] || null;

    if (eventId) {
      try {
        const rec = await this.paymentsService.recordWebhookEvent(String(eventId), body.type, body);
        if (rec && rec.duplicated) {
          this.logger.log(`Duplicate webhook event ${eventId} - ignoring`);
          return { success: true, data: { duplicated: true }, error: null };
        }
      } catch (e) {
        this.logger.warn('Failed to record webhook event idempotency: ' + (e as any).message);
      }
    }

    try {
      const eventType = body.type;
      const data = body.data;

      if (eventType === 'payment.succeeded' || data.status === 'COMPLETED') {
        const payload = {
          tenant_id: data.tenant_id,
          lease_id: data.lease_id,
          amount: Number(data.amount),
          paid_date: data.paid_date,
          payment_method: data.payment_method || data.gateway || 'UNKNOWN',
        };

        if (!payload.tenant_id || !payload.amount) {
          throw new BadRequestException('webhook missing tenant_id or amount');
        }

        const recorded = await this.paymentsService.recordPayment(payload);
        return { success: true, data: recorded, error: null };
      }

      return { success: true, data: { handled: false }, error: null };
    } catch (e) {
      this.logger.error('Webhook processing failed', e as any);
      throw e;
    }
  }
}
