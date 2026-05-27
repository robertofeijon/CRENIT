import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { SupabaseService } from '../supabase/supabase.service';
import { AttachmentsService } from '../landlords/attachments.service';
import { getUserProfileFromAuthHeader, assertRole } from '../supabase/supabase.utils';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly supabaseService: SupabaseService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  @Get('health')
  health() {
    return { success: true, data: { module: 'admin' }, error: null };
  }

  @Get('kyc/pending')
  async getPendingKyc(
    @Headers('authorization') authHeader: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status = 'PENDING',
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const result = await this.adminService.getPendingKycSubmissions({ page: Number(page), limit: Number(limit), status: status.toUpperCase() });
    return { success: true, data: result, error: null };
  }

  @Post('kyc/review/:userId')
  async reviewKyc(
    @Headers('authorization') authHeader: string,
    @Param('userId') userId: string,
    @Body() body: { action: 'approve' | 'reject'; reason?: string },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    if (!['approve', 'reject'].includes(body.action)) {
      throw new BadRequestException('Invalid action');
    }
    if (body.action === 'reject' && !body.reason?.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }
    const result = await this.adminService.reviewKycSubmission(profile, userId, body.action, body.reason?.trim() ?? null);
    return { success: true, data: result, error: null };
  }

  @Get('kyc/audit/:userId')
  async getKycAuditLog(
    @Headers('authorization') authHeader: string,
    @Param('userId') userId: string,
    @Query('limit') limit = '30',
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const result = await this.adminService.getKycAuditLog(userId, Number(limit));
    return { success: true, data: result, error: null };
  }

  @Get('kyc/compliance')
  async kycCompliance(
    @Headers('authorization') authHeader: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const result = await this.adminService.getKycComplianceOverview(Number(page), Number(limit));
    return { success: true, data: result, error: null };
  }

  @Post('kyc/flags/:flagId/dismiss')
  async dismissKycFlag(
    @Headers('authorization') authHeader: string,
    @Param('flagId') flagId: string,
    @Body() body: { note?: string },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const result = await this.adminService.dismissKycFlag(profile.id, flagId, body?.note || '');
    return { success: true, data: result, error: null };
  }

  @Get('users')
  async listUsers(
    @Headers('authorization') authHeader: string,
    @Query('role') role?: string,
    @Query('kyc_status') kyc_status?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const result = await this.adminService.listUsers({
      role: role?.toUpperCase(),
      kycStatus: kyc_status?.toUpperCase(),
      search: search ?? '',
      page: Number(page),
      limit: Number(limit),
    });
    return { success: true, data: result, error: null };
  }

  @Put('users/:userId/suspend')
  async suspendUser(
    @Headers('authorization') authHeader: string,
    @Param('userId') userId: string,
    @Body() body: { suspended: boolean; reason?: string | null },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const result = await this.adminService.updateUserSuspension(profile, userId, body.suspended, body.reason ?? null);
    return { success: true, data: result, error: null };
  }

  @Get('partners')
  async partners(
    @Headers('authorization') authHeader: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status = 'ALL',
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const result = await this.adminService.getPartnerApplications({ page: Number(page), limit: Number(limit), status: status.toUpperCase() });
    return { success: true, data: result, error: null };
  }

  @Put('partners/:landlordId/status')
  async updatePartnerStatus(
    @Headers('authorization') authHeader: string,
    @Param('landlordId') landlordId: string,
    @Body() body: { status: 'PENDING' | 'APPROVED' | 'SUSPENDED' },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    if (!['PENDING', 'APPROVED', 'SUSPENDED'].includes(body.status)) {
      throw new BadRequestException('Invalid partner status');
    }
    const result = await this.adminService.updatePartnerStatus(profile, landlordId, body.status);
    return { success: true, data: result, error: null };
  }

  @Get('overview')
  async overview(@Headers('authorization') authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const result = await this.adminService.getOverview();
    return { success: true, data: result, error: null };
  }

  @Get('audit-log')
  async auditLog(
    @Headers('authorization') authHeader: string,
    @Query('page') page = '1',
    @Query('limit') limit = '30',
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const result = await this.adminService.getAuditLog(Number(page), Number(limit));
    return { success: true, data: result, error: null };
  }

  @Get('payments')
  async payments(
    @Headers('authorization') authHeader: string,
    @Query('page') page = '1',
    @Query('limit') limit = '30',
    @Query('payment_method') paymentMethod?: string,
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const result = await this.adminService.getPaymentOversight(Number(page), Number(limit), paymentMethod);
    return { success: true, data: result, error: null };
  }

  @Get('credit-scores/audit')
  async creditScoreAudit(@Headers('authorization') authHeader: string, @Query('limit') limit = '100') {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const result = await this.adminService.getCreditScoreAudit(Number(limit));
    return { success: true, data: result, error: null };
  }

  @Get('credit-scores/:tenantId/history')
  async creditScoreHistory(
    @Headers('authorization') authHeader: string,
    @Param('tenantId') tenantId: string,
    @Query('limit') limit = '12',
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const result = await this.adminService.getCreditScoreHistory(tenantId, Number(limit));
    return { success: true, data: result, error: null };
  }

  @Post('credit-scores/:tenantId/flag-anomaly')
  async flagAnomaly(
    @Headers('authorization') authHeader: string,
    @Param('tenantId') tenantId: string,
    @Body() body: { note?: string },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const result = await this.adminService.flagCreditScoreAnomaly(profile.id, tenantId, body?.note || 'Flagged anomaly');
    return { success: true, data: result, error: null };
  }

  @Post('credit-scores/:tenantId/manual-override')
  async overrideScore(
    @Headers('authorization') authHeader: string,
    @Param('tenantId') tenantId: string,
    @Body() body: { score: number; reason: string },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    if (body.score == null || !body.reason?.trim()) {
      throw new BadRequestException('score and reason are required');
    }
    const result = await this.adminService.manualOverrideCreditScore(profile.id, tenantId, Number(body.score), body.reason.trim());
    return { success: true, data: result, error: null };
  }

  @Get('system-health/overview')
  async systemHealth(@Headers('authorization') authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const result = await this.adminService.getSystemHealthSnapshot();
    return { success: true, data: result, error: null };
  }

  @Get('compliance/search-users')
  async complianceSearchUsers(
    @Headers('authorization') authHeader: string,
    @Query('q') q = '',
    @Query('limit') limit = '20',
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const result = await this.adminService.listUsers({ search: q, page: 1, limit: Number(limit) });
    return { success: true, data: result.users, error: null };
  }

  @Post('compliance/:userId/export')
  async complianceExport(@Headers('authorization') authHeader: string, @Param('userId') userId: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const result = await this.adminService.exportUserDataForGdpr(profile.id, userId);
    return { success: true, data: result, error: null };
  }

  @Post('compliance/:userId/delete')
  async complianceDelete(
    @Headers('authorization') authHeader: string,
    @Param('userId') userId: string,
    @Body() body: { confirmation_text: string; expected_name?: string },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    if (!body?.confirmation_text?.trim()) {
      throw new BadRequestException('confirmation_text is required');
    }
    const result = await this.adminService.anonymiseUserForGdpr(profile.id, userId);
    return { success: true, data: result, error: null };
  }

  // Attachments & Service Requests endpoints
  @Get('service-requests')
  async getPendingServiceRequests(@Headers('authorization') authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const data = await this.attachmentsService.getPendingRequests();
    return { success: true, data, error: null };
  }

  @Post('service-requests/:requestId/assign')
  async assignServiceRequest(
    @Headers('authorization') authHeader: string,
    @Param('requestId') requestId: string,
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const result = await this.attachmentsService.assignRequest(requestId, profile.id);
    return { success: true, data: result, error: null };
  }

  @Post('service-requests/:requestId/complete')
  async completeServiceRequest(
    @Headers('authorization') authHeader: string,
    @Param('requestId') requestId: string,
    @Body() body?: { notes?: any },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const result = await this.attachmentsService.completeRequest(requestId, body?.notes);
    return { success: true, data: result, error: null };
  }

  @Get('attachments')
  async getPendingAttachments(
    @Headers('authorization') authHeader: string,
    @Query('status') status: string = 'PENDING',
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const client = this.supabaseService.getClient();

    let query = client.from('attachments').select('*').order('uploaded_at', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(`Failed to fetch attachments: ${error.message}`);

    return { success: true, data: data || [], error: null };
  }

  @Post('attachments/:attachmentId/verify')
  async verifyAttachment(
    @Headers('authorization') authHeader: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const result = await this.attachmentsService.verifyAttachment(attachmentId, profile.id, true);
    return { success: true, data: result, error: null };
  }

  @Post('attachments/:attachmentId/reject')
  async rejectAttachment(
    @Headers('authorization') authHeader: string,
    @Param('attachmentId') attachmentId: string,
    @Body() body: { rejection_reason: string },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');

    if (!body.rejection_reason?.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }

    const result = await this.attachmentsService.verifyAttachment(
      attachmentId,
      profile.id,
      false,
      body.rejection_reason,
    );
    return { success: true, data: result, error: null };
  }

  @Get('partner-approvals')
  async partnerApprovals(
    @Headers('authorization') authHeader: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const result = await this.adminService.getPartnerApprovals(Number(page), Number(limit));
    return { success: true, data: result, error: null };
  }

  @Post('partner-approvals/:submissionId/review')
  async reviewPartnerApproval(
    @Headers('authorization') authHeader: string,
    @Param('submissionId') submissionId: string,
    @Body() body: { action: 'APPROVE' | 'REJECT'; reason?: string },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'ADMIN');
    const result = await this.adminService.reviewPartnerApproval(profile.id, submissionId, body.action, body.reason);
    return { success: true, data: result, error: null };
  }
}

