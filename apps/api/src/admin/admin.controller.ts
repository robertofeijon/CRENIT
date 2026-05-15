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
import { getUserProfileFromAuthHeader, assertRole } from '../supabase/supabase.utils';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly supabaseService: SupabaseService,
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
}
