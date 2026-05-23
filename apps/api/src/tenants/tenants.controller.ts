import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserFromAuthHeader } from '../supabase/supabase.utils';

@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('health')
  health() {
    return { success: true, data: { module: 'tenants' }, error: null };
  }

  @Get('me')
  async me(@Headers('authorization') authHeader: string) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      const result = await this.tenantsService.buildDashboard(user.id);
      return { success: true, data: result, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unauthorized');
    }
  }

  @Get('payments')
  async payments(@Headers('authorization') authHeader: string) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      const result = await this.tenantsService.getPaymentHistory(user.id);
      return { success: true, data: result, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unauthorized');
    }
  }
}
