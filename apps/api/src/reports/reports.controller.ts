import { Body, Controller, Get, Headers, Param, Post, Query, Res, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserFromAuthHeader, getUserProfileFromAuthHeader, assertKycApproved, assertRole } from '../supabase/supabase.utils';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('health')
  health() {
    return { success: true, data: { module: 'reports' }, error: null };
  }

  @Get('tenant/download')
  async downloadTenantReport(
    @Headers('authorization') authHeader: string,
    @Res() res: Response,
  ) {
    try {
      const { profile, user } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
      assertKycApproved(profile);
      const pdfBuffer = await this.reportsService.generateTenantReport(user.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="crenit-tenant-report.pdf"');
      res.send(pdfBuffer);
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unable to generate report.');
    }
  }

  @Get('credit-score')
  async downloadCreditScoreReport(
    @Headers('authorization') authHeader: string,
    @Res() res: Response,
  ) {
    try {
      const { profile, user } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
      assertKycApproved(profile);
      const pdfBuffer = await this.reportsService.generateTenantReport(user.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="crenit-credit-score-report.pdf"');
      res.send(pdfBuffer);
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unable to generate report.');
    }
  }

  @Get('landlord/portfolio')
  async downloadLandlordPortfolioReport(
    @Headers('authorization') authHeader: string,
    @Query('month') month: string,
    @Res() res: Response,
  ) {
    try {
      const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
      assertRole(profile, 'LANDLORD');
      const pdfBuffer = await this.reportsService.generateLandlordPortfolioReport(profile.id, month);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="crenit-landlord-portfolio-report.pdf"');
      res.send(pdfBuffer);
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unable to generate report.');
    }
  }

  @Get('landlord/tenant/:tenantId')
  async downloadLandlordTenantReport(
    @Headers('authorization') authHeader: string,
    @Param('tenantId') tenantId: string,
    @Res() res: Response,
  ) {
    try {
      const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
      assertRole(profile, 'LANDLORD');
      const pdfBuffer = await this.reportsService.generateTenantPaymentReport(profile.id, tenantId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="crenit-landlord-tenant-report.pdf"');
      res.send(pdfBuffer);
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unable to generate report.');
    }
  }

  @Post('credit-score/share')
  async shareCreditReport(
    @Headers('authorization') authHeader: string,
    @Body() body: { expiry_days?: number },
    @Res() res: Response,
  ) {
    try {
      const { profile, user } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
      assertKycApproved(profile);
      const result = await this.reportsService.generateShareableCreditReport(user.id, Number(body?.expiry_days ?? 30));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="crenit-credit-report.pdf"');
      res.setHeader('X-Report-Reference', result.reference);
      res.setHeader('X-Report-Expires-At', result.expires_at);
      res.send(result.buffer);
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unable to generate shareable report.');
    }
  }

  @Get('verify/:reference')
  async verifyReference(@Param('reference') reference: string) {
    const verification = await this.reportsService.verifyReportReference(reference);
    if (!verification) {
      return { success: true, data: { authentic: false, message: 'Report not found' }, error: null };
    }
    if ((verification as any).invalid_reason === 'expired') {
      return {
        success: true,
        data: { authentic: false, message: 'This report has expired.', expired_at: verification.expires_at },
        error: null,
      };
    }
    if ((verification as any).invalid_reason === 'revoked') {
      return { success: true, data: { authentic: false, message: 'This report was revoked by the tenant.' }, error: null };
    }
    return {
      success: true,
      data: {
        authentic: true,
        message: 'This CRENIT Score Report is authentic.',
        score: verification.score,
        tier: verification.tier,
        brand_tier: verification.brand_tier,
        score_100: verification.score_100,
        generated_at: verification.generated_at,
        expires_at: verification.expires_at,
      },
      error: null,
    };
  }
}
