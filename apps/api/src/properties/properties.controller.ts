import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserProfileFromAuthHeader, assertRole, assertPartnerApproved } from '../supabase/supabase.utils';

@Controller('landlords/properties')
export class PropertiesController {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get()
  async list(@Headers('authorization') authHeader: string) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    assertPartnerApproved(profile, 'Your landlord account is under review. Property creation is temporarily locked.');
    const properties = await this.propertiesService.listProperties(profile.id);
    return { success: true, data: properties, error: null };
  }

  @Post()
  async create(
    @Headers('authorization') authHeader: string,
    @Body()
    body: {
      property_name: string;
      address_street: string;
      address_suburb: string;
      address_city: string;
      address_postcode?: string;
      property_type: string;
      unit?: { unit_identifier: string; bedrooms?: number; bathrooms?: number; monthly_rent: number };
    },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    assertPartnerApproved(profile, 'Your landlord account is under review. Unit creation is temporarily locked.');

    if (!body?.property_name || !body?.address_street || !body?.address_suburb || !body?.address_city || !body?.property_type) {
      throw new BadRequestException('property_name, address fields, and property_type are required');
    }

    const property = await this.propertiesService.createProperty(profile.id, body);
    return { success: true, data: property, error: null };
  }

  @Patch(':propertyId')
  async updateProperty(
    @Headers('authorization') authHeader: string,
    @Param('propertyId') propertyId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    const property = await this.propertiesService.updateProperty(profile.id, propertyId, body);
    return { success: true, data: property, error: null };
  }

  @Post(':propertyId/units')
  async addUnit(
    @Headers('authorization') authHeader: string,
    @Param('propertyId') propertyId: string,
    @Body() body: { unit_identifier: string; bedrooms?: number; bathrooms?: number; monthly_rent: number },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');

    if (!body?.unit_identifier || body.monthly_rent == null) {
      throw new BadRequestException('unit_identifier and monthly_rent are required');
    }

    const unit = await this.propertiesService.addUnit(profile.id, propertyId, body);
    return { success: true, data: unit, error: null };
  }

  @Patch('units/:unitId')
  async updateUnit(
    @Headers('authorization') authHeader: string,
    @Param('unitId') unitId: string,
    @Body() body: { unit_identifier?: string; bedrooms?: number; bathrooms?: number; monthly_rent?: number; is_occupied?: boolean },
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    const unit = await this.propertiesService.updateUnit(profile.id, unitId, body);
    return { success: true, data: unit, error: null };
  }
}
