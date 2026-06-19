import { Controller, Post, Get, Body, Param, Headers, BadRequestException, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { DepositsService } from './deposits.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserProfileFromAuthHeader, assertKycApproved, assertRole } from '../supabase/supabase.utils';

@Controller('disputes')
export class DisputesController {
  constructor(
    private readonly depositsService: DepositsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('templates')
  async templates() {
    const data = this.depositsService.getDisputeTemplates();
    return { success: true, data, error: null };
  }

  @Post('file')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'evidence', maxCount: 10 }]))
  async fileDispute(
    @Headers('authorization') authHeader: string,
    @Body()
    body: {
      deposit_id: string;
      reason: string;
      description: string;
      requested_amount: number;
      dispute_type?: string;
    },
    @UploadedFiles() files: { evidence?: any[] },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertKycApproved(profile);

    if (!body.deposit_id || !body.reason || !body.description || !body.requested_amount) {
      throw new BadRequestException('deposit_id, reason, description, and requested_amount are required');
    }

    const dispute = await this.depositsService.fileDispute(
      profile.id,
      {
        depositId: body.deposit_id,
        reason: body.reason,
        description: body.description,
        requestedAmount: Number(body.requested_amount),
        disputeType: body.dispute_type as any,
      },
      files?.evidence || [],
    );

    return {
      success: true,
      data: {
        dispute_id: dispute.id,
        status: dispute.status,
        deadline: dispute.evidence_deadline,
      },
      error: null,
    };
  }

  @Get(':disputeId')
  async getDispute(@Headers('authorization') authHeader: string, @Param('disputeId') disputeId: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    const dispute = await this.depositsService.getDispute(profile.id, disputeId, profile.role?.toString());
    return { success: true, data: dispute, error: null };
  }

  @Post(':disputeId/respond')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'evidence', maxCount: 10 }]))
  async respond(
    @Headers('authorization') authHeader: string,
    @Param('disputeId') disputeId: string,
    @Body() body: { response: 'accept_full' | 'accept_partial' | 'reject'; proposed_amount?: number; reason?: string },
    @UploadedFiles() files: { evidence?: any[] },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');

    const response = await this.depositsService.landlordRespond(profile.id, disputeId, body.response, body.proposed_amount, body.reason, files?.evidence || []);
    return { success: true, data: response, error: null };
  }

  @Post(':disputeId/accept-settlement')
  async acceptSettlement(
    @Headers('authorization') authHeader: string,
    @Param('disputeId') disputeId: string,
    @Body() body: { accept: boolean },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertKycApproved(profile);

    const result = await this.depositsService.tenantAcceptSettlement(profile.id, disputeId, body.accept);
    return { success: true, data: result, error: null };
  }

  @Post(':disputeId/appeal')
  async appeal(
    @Headers('authorization') authHeader: string,
    @Param('disputeId') disputeId: string,
    @Body() body: { reason: string },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertKycApproved(profile);

    const result = await this.depositsService.fileDisputeAppeal(profile.id, disputeId, body.reason);
    return { success: true, data: result, error: null };
  }
}
