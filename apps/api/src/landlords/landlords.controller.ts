import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Patch, Post, Res, UnauthorizedException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { LandlordsService } from './landlords.service';
import { LeaseDocumentService, LeaseDocumentInput } from './lease-document.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserFromAuthHeader, getUserProfileFromAuthHeader, assertRole, assertPartnerApproved } from '../supabase/supabase.utils';

@Controller('landlords')
export class LandlordsController {
  constructor(
    private readonly landlordsService: LandlordsService,
    private readonly leaseDocumentService: LeaseDocumentService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('health')
  health() {
    return { success: true, data: { module: 'landlords' }, error: null };
  }

  @Get('overview')
  async overview(@Headers('authorization') authHeader: string) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      const result = await this.landlordsService.buildOverview(user.id);
      return { success: true, data: result, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unauthorized');
    }
  }

  @Get('tenants')
  async listTenants(@Headers('authorization') authHeader: string) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      const result = await this.landlordsService.listTenants(user.id);
      return { success: true, data: result, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unauthorized');
    }
  }

  @Get('tenants/:tenantId')
  async getTenant(@Headers('authorization') authHeader: string, @Param('tenantId') tenantId: string) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      const result = await this.landlordsService.getTenantReview(user.id, tenantId);
      return { success: true, data: result, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unauthorized');
    }
  }

  @Patch('tenants/:tenantId/kyc')
  async updateTenantKyc(
    @Headers('authorization') authHeader: string,
    @Param('tenantId') tenantId: string,
    @Body() body: { status: string; reason?: string },
  ) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      if (!['APPROVED', 'REJECTED', 'PENDING', 'NOT_SUBMITTED'].includes(body.status)) {
        throw new BadRequestException('Invalid KYC status');
      }
      if (body.status === 'REJECTED' && !body.reason?.trim()) {
        throw new BadRequestException('Rejection reason is required when rejecting KYC');
      }
      const result = await this.landlordsService.updateTenantKycStatus(user.id, tenantId, body.status, body.reason?.trim());
      return { success: true, data: result, error: null };
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(error?.message || 'Unable to update KYC status.');
    }
  }

  @Post('invite')
  async invite(
    @Headers('authorization') authHeader: string,
    @Body() body: { email: string; full_name: string; unit_id?: string },
  ) {
    try {
      const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
      assertRole(profile, 'LANDLORD');
      assertPartnerApproved(profile, 'Your landlord account is under review. Tenant invites are locked until approval.');
      if (!body?.email || !body?.full_name) {
        throw new BadRequestException('email and full_name are required');
      }
      const result = await this.landlordsService.inviteTenant(profile.id, body);
      return { success: true, data: result, error: null };
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(error?.message || 'Unable to invite tenant.');
    }
  }

  @Get('invites')
  async listInvites(@Headers('authorization') authHeader: string) {
    try {
      const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
      assertRole(profile, 'LANDLORD');
      const invites = await this.landlordsService.listInvites(profile.id);
      return { success: true, data: invites, error: null };
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Unable to list invites.');
    }
  }

  @Post('invites/:inviteId/cancel')
  async cancelInvite(@Headers('authorization') authHeader: string, @Param('inviteId') inviteId: string) {
    try {
      const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
      assertRole(profile, 'LANDLORD');
      const invite = await this.landlordsService.cancelInvite(profile.id, inviteId);
      return { success: true, data: invite, error: null };
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Unable to cancel invite.');
    }
  }

  @Post('invites/:inviteId/resend')
  async resendInvite(@Headers('authorization') authHeader: string, @Param('inviteId') inviteId: string) {
    try {
      const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
      assertRole(profile, 'LANDLORD');
      const invite = await this.landlordsService.resendInvite(profile.id, inviteId);
      return { success: true, data: invite, error: null };
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Unable to resend invite.');
    }
  }

  @Get('leases')
  async listLeases(@Headers('authorization') authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    assertPartnerApproved(profile, 'Your landlord account is under review. Lease creation is locked until approval.');
    const leases = await this.landlordsService.listLeases(profile.id);
    return { success: true, data: leases, error: null };
  }

  @Post('leases/document/download')
  async downloadLeaseDocument(
    @Headers('authorization') authHeader: string,
    @Body() body: LeaseDocumentInput,
    @Res() res: Response,
  ) {
    try {
      const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
      assertRole(profile, 'LANDLORD');
      const pdfBuffer = await this.leaseDocumentService.generateLeaseAgreementPdf(profile.id, body);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="crenit-lease-agreement.pdf"');
      res.send(pdfBuffer);
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(error?.message || 'Unable to generate lease document.');
    }
  }

  @Get('leases/:leaseId')
  async getLease(@Headers('authorization') authHeader: string, @Param('leaseId') leaseId: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    const lease = await this.landlordsService.getLease(profile.id, leaseId);
    return { success: true, data: lease, error: null };
  }

  @Post('leases')
  async createLease(
    @Headers('authorization') authHeader: string,
    @Body()
    body: {
      tenant_id?: string;
      tenant_email?: string;
      unit_id: string;
      monthly_rent: number;
      payment_method?: 'PLATFORM' | 'DIRECT';
      start_date?: string;
      end_date?: string;
      status?: string;
    },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    if (!body?.unit_id || body.monthly_rent == null || (!body.tenant_id && !body.tenant_email)) {
      throw new BadRequestException('unit_id, monthly_rent, and tenant_id or tenant_email are required');
    }
    const lease = await this.landlordsService.createLease(profile.id, body);
    return { success: true, data: lease, error: null };
  }

  @Patch('leases/:leaseId')
  async updateLease(
    @Headers('authorization') authHeader: string,
    @Param('leaseId') leaseId: string,
    @Body()
    body: {
      monthly_rent?: number;
      start_date?: string;
      end_date?: string;
      status?: string;
    },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    const allowedStatuses = ['ACTIVE', 'ENDED', 'TERMINATED'];
    if (body.status && !allowedStatuses.includes(body.status)) {
      throw new BadRequestException('Invalid lease status');
    }
    const lease = await this.landlordsService.updateLease(profile.id, leaseId, body);
    return { success: true, data: lease, error: null };
  }

  @Delete('leases/:leaseId')
  async deleteLease(@Headers('authorization') authHeader: string, @Param('leaseId') leaseId: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    await this.landlordsService.deleteLease(profile.id, leaseId);
    return { success: true, data: { deleted: true }, error: null };
  }

  @Get('renewals')
  async listRenewals(@Headers('authorization') authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    const renewals = await this.landlordsService.listRenewals(profile.id);
    return { success: true, data: renewals, error: null };
  }

  @Post('renewals/:renewalId/respond')
  async respondToRenewal(
    @Headers('authorization') authHeader: string,
    @Param('renewalId') renewalId: string,
    @Body() body: { action: 'APPROVE' | 'REJECT' | 'COUNTER'; proposed_rent?: number; proposed_end_date?: string },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    const result = await this.landlordsService.respondToRenewal(profile.id, renewalId, body);
    return { success: true, data: result, error: null };
  }

  @Post('leases/:leaseId/payment-method-switch/request')
  async requestLeasePaymentMethodSwitch(
    @Headers('authorization') authHeader: string,
    @Param('leaseId') leaseId: string,
    @Body() body: { requested_method: 'PLATFORM' | 'DIRECT' },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    const result = await this.landlordsService.requestLeasePaymentMethodSwitch(profile.id, leaseId, body.requested_method);
    return { success: true, data: result, error: null };
  }

  @Post('lease/payment-method-switch/confirm')
  async confirmLeasePaymentMethodSwitch(
    @Headers('authorization') authHeader: string,
    @Body() body: { request_id: string },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    const result = await this.landlordsService.confirmLeasePaymentMethodSwitch(profile.id, body.request_id);
    return { success: true, data: result, error: null };
  }

  @Get('lease/payment-method-switch/requests')
  async listLeasePaymentMethodSwitchRequests(@Headers('authorization') authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    const result = await this.landlordsService.listLeasePaymentMethodSwitchRequests(profile.id);
    return { success: true, data: result, error: null };
  }

  @Get('onboarding/status')
  async onboardingStatus(@Headers('authorization') authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    const result = await this.landlordsService.getOnboardingStatus(profile.id);
    return { success: true, data: result, error: null };
  }

  @Get('leases/:leaseId/agreements')
  async listLeaseAgreements(
    @Headers('authorization') authHeader: string,
    @Param('leaseId') leaseId: string,
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    const result = await this.landlordsService.listLeaseAgreements(profile.id, leaseId);
    return { success: true, data: result, error: null };
  }

  @Post('leases/:leaseId/agreements/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLeaseAgreement(
    @Headers('authorization') authHeader: string,
    @Param('leaseId') leaseId: string,
    @UploadedFile() file: any,
    @Body() body: { title?: string; document_type?: 'LEASE_AGREEMENT' | 'ADDENDUM' | 'RENEWAL' | 'TERMINATION' | 'OTHER'; notes?: string },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    const result = await this.landlordsService.uploadLeaseAgreement(profile.id, leaseId, file, body);
    return { success: true, data: result, error: null };
  }

  @Post('onboarding/upload')
  async uploadOnboardingDocument(
    @Headers('authorization') authHeader: string,
    @Body()
    body: {
      doc_type: 'id' | 'ownership';
      filename: string;
      fileBase64: string;
    },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    if (!body.doc_type || !body.filename || !body.fileBase64) {
      throw new BadRequestException('doc_type, filename and fileBase64 are required');
    }
    if (!['id', 'ownership'].includes(body.doc_type)) {
      throw new BadRequestException('doc_type must be id or ownership');
    }
    const result = await this.landlordsService.uploadOnboardingDocument(profile.id, body);
    return { success: true, data: result, error: null };
  }

  @Post('onboarding/submit')
  async submitOnboarding(
    @Headers('authorization') authHeader: string,
    @Headers('x-forwarded-for') forwardedFor: string,
    @Headers('user-agent') userAgent: string,
    @Body()
    body: {
      full_legal_name: string;
      business_name?: string;
      registration_number: string;
      phone_number: string;
      id_document_path: string;
      ownership_document_path: string;
      properties_intended: number;
      tenants_estimated: number;
      consent_text_version: string;
    },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    const result = await this.landlordsService.submitOnboarding(profile.id, {
      ...body,
      consent_ip: forwardedFor || '',
      consent_user_agent: userAgent || '',
    });
    return { success: true, data: result, error: null };
  }
}
