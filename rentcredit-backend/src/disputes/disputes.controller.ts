import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { DisputesService } from './disputes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RoleGuard } from '../auth/guards/role.guard';
import { CreateDisputeDto } from './dto/dispute.dto';

@Controller('disputes')
export class DisputesController {
  constructor(private disputesService: DisputesService) {}

  // Only admin can view all disputes
  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllDisputes(
    @Request() req: ExpressRequest & { user: { userId: string; role: string } },
  ) {
    if (req.user.role !== 'admin') {
      throw new Error('Only admins can view all disputes');
    }
    return await this.disputesService.getAllDisputes();
  }

  // Get disputes for landlord (their disputes)
  @Get('landlord/my-disputes')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('landlord')
  async getLandlordDisputes(
    @Request() req: ExpressRequest & { user: { userId: string } },
  ) {
    return await this.disputesService.getLandlordDisputes(req.user.userId);
  }

  // Get disputes for tenant (their disputes)
  @Get('tenant/my-disputes')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('tenant')
  async getTenantDisputes(
    @Request() req: ExpressRequest & { user: { userId: string } },
  ) {
    return await this.disputesService.getTenantDisputes(req.user.userId);
  }

  // Create a dispute
  @Post()
  @UseGuards(JwtAuthGuard)
  async createDispute(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Body() body: CreateDisputeDto,
  ) {
    return await this.disputesService.createDispute(
      req.user.userId,
      body.paymentId,
      body.type,
      body.reason,
      body.description,
      body.amount,
    );
  }

  // Admin resolves dispute
  @Put(':disputeId/resolve')
  @UseGuards(JwtAuthGuard)
  async resolveDispute(
    @Param('disputeId') disputeId: string,
    @Request() req: ExpressRequest & { user: { userId: string; role: string } },
    @Body() body: { resolution: string },
  ) {
    if (req.user.role !== 'admin') {
      throw new Error('Only admins can resolve disputes');
    }
    return await this.disputesService.resolveDispute(
      disputeId,
      req.user.userId,
      'resolved',
      body.resolution,
    );
  }

  // Admin rejects dispute
  @Put(':disputeId/reject')
  @UseGuards(JwtAuthGuard)
  async rejectDispute(
    @Param('disputeId') disputeId: string,
    @Request() req: ExpressRequest & { user: { userId: string; role: string } },
    @Body() body: { resolution: string },
  ) {
    if (req.user.role !== 'admin') {
      throw new Error('Only admins can reject disputes');
    }
    return await this.disputesService.resolveDispute(
      disputeId,
      req.user.userId,
      'rejected',
      body.resolution,
    );
  }
}
