import { Controller, Get, UseGuards, Request, Param } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RoleGuard } from '../auth/guards/role.guard';

@Controller('tenants')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get('by-property/:propertyId')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('landlord')
  async getTenantsByProperty(@Param('propertyId') propertyId: string, @Request() req) {
    return await this.tenantsService.getTenantsByProperty(propertyId, req.user.userId);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('landlord')
  async getLandlordTenants(@Request() req) {
    return await this.tenantsService.getLandlordTenants(req.user.userId);
  }

  @Get('profile/:tenantId')
  @UseGuards(JwtAuthGuard)
  async getTenantProfile(@Param('tenantId') tenantId: string) {
    return await this.tenantsService.getTenantProfile(tenantId);
  }

  @Get(':tenantId/reliability')
  @UseGuards(JwtAuthGuard)
  async getTenantReliabilityScore(@Param('tenantId') tenantId: string) {
    return await this.tenantsService.getTenantReliabilityScore(tenantId);
  }
}
