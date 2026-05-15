import { Controller, Get, Headers, Param, Query, Res, UnauthorizedException } from '@nestjs/common';
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
      res.setHeader('Content-Disposition', 'attachment; filename="rentcredit-tenant-report.pdf"');
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
      res.setHeader('Content-Disposition', 'attachment; filename="rentcredit-credit-score-report.pdf"');
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
      res.setHeader('Content-Disposition', 'attachment; filename="rentcredit-landlord-portfolio-report.pdf"');
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
      res.setHeader('Content-Disposition', 'attachment; filename="rentcredit-landlord-tenant-report.pdf"');
      res.send(pdfBuffer);
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unable to generate report.');
    }
  }
}
