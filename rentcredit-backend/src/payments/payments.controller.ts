import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  Param,
  Query,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  UpdatePaymentStatusDto,
  RecordPaymentDto,
} from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RoleGuard } from '../auth/guards/role.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('landlord')
  async createPayment(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return await this.paymentsService.createPayment(
      req.user.userId,
      createPaymentDto,
    );
  }

  @Post(':paymentId/record')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('tenant')
  async recordPayment(
    @Param('paymentId') paymentId: string,
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Body() recordPaymentDto: RecordPaymentDto,
  ) {
    return await this.paymentsService.recordPayment(
      paymentId,
      req.user.userId,
      recordPaymentDto,
    );
  }

  @Get('tenant')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('tenant')
  async getTenantPayments(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Query('status') status?: string,
  ) {
    return await this.paymentsService.getTenantPayments(
      req.user.userId,
      status,
    );
  }

  @Get('property/:propertyId')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('landlord')
  async getPropertyPayments(@Param('propertyId') propertyId: string) {
    return await this.paymentsService.getPropertyPayments(propertyId);
  }

  @Get(':paymentId')
  @UseGuards(JwtAuthGuard)
  async getPaymentDetails(@Param('paymentId') paymentId: string) {
    return await this.paymentsService.getPaymentDetails(paymentId);
  }

  @Put(':paymentId/status')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('landlord')
  async updatePaymentStatus(
    @Param('paymentId') paymentId: string,
    @Body() updatePaymentStatusDto: UpdatePaymentStatusDto,
  ) {
    return await this.paymentsService.updatePaymentStatus(
      paymentId,
      updatePaymentStatusDto,
    );
  }
}
