import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { isKycApproved } from '../supabase/supabase.utils';

@Injectable()
export class PropertiesService {
  constructor(private readonly supabase: SupabaseService) {}

  private getClient() {
    return this.supabase.getClient();
  }

  private async getLandlordProfileId(userId: string) {
    const client = this.getClient();
    const { data: existing } = await client.from('landlord_profiles').select('id').eq('user_id', userId).maybeSingle();
    if (existing?.id) {
      return existing.id;
    }

    const { data: created, error } = await client
      .from('landlord_profiles')
      .insert([{ user_id: userId, business_name: 'My Portfolio', partner_status: 'APPROVED' }])
      .select('id')
      .single();

    if (error || !created) {
      throw new NotFoundException('Landlord profile not found');
    }

    return created.id;
  }

  async listProperties(landlordUserId: string) {
    const client = this.getClient();
    const landlordId = await this.getLandlordProfileId(landlordUserId);
    const { data, error } = await client.from('properties').select('*, units(*)').eq('landlord_id', landlordId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  private async assertLandlordKycApproved(userId: string) {
    const client = this.getClient();
    const { data: profile, error } = await client.from('profiles').select('kyc_status').eq('id', userId).single();
    if (error || !profile || !isKycApproved(profile)) {
      throw new UnauthorizedException('Landlord KYC must be approved before adding properties');
    }
  }

  async createProperty(
    landlordUserId: string,
    payload: {
      property_name: string;
      address_street: string;
      address_suburb: string;
      address_city: string;
      address_postcode?: string;
      property_type: string;
      unit?: {
        unit_identifier: string;
        bedrooms?: number;
        bathrooms?: number;
        monthly_rent: number;
      };
    },
  ) {
    await this.assertLandlordKycApproved(landlordUserId);
    const client = this.getClient();
    const landlordId = await this.getLandlordProfileId(landlordUserId);

    const { data: propertyRows, error: propertyError } = await client
      .from('properties')
      .insert([
        {
          landlord_id: landlordId,
          property_name: payload.property_name,
          address_street: payload.address_street,
          address_suburb: payload.address_suburb,
          address_city: payload.address_city,
          address_postcode: payload.address_postcode || null,
          property_type: payload.property_type,
        },
      ])
      .select()
      .limit(1);

    if (propertyError || !propertyRows?.[0]) {
      throw propertyError || new BadRequestException('Failed to create property');
    }

    const property = propertyRows[0];
    let unit = null;

    if (payload.unit) {
      const { data: unitRows, error: unitError } = await client
        .from('units')
        .insert([
          {
            property_id: property.id,
            unit_identifier: payload.unit.unit_identifier,
            bedrooms: payload.unit.bedrooms ?? null,
            bathrooms: payload.unit.bathrooms ?? null,
            monthly_rent: payload.unit.monthly_rent,
            is_occupied: false,
          },
        ])
        .select()
        .limit(1);
      if (unitError) throw unitError;
      unit = unitRows?.[0] ?? null;
    }

    return { ...property, units: unit ? [unit] : [] };
  }

  async updateProperty(landlordUserId: string, propertyId: string, updates: Record<string, unknown>) {
    const client = this.getClient();
    const landlordId = await this.getLandlordProfileId(landlordUserId);
    await this.assertPropertyOwnership(landlordId, propertyId);

    const allowed = ['property_name', 'address_street', 'address_suburb', 'address_city', 'address_postcode', 'property_type'];
    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) patch[key] = updates[key];
    }

    const { data, error } = await client.from('properties').update(patch).eq('id', propertyId).select('*, units(*)').single();
    if (error) throw error;
    return data;
  }

  async addUnit(
    landlordUserId: string,
    propertyId: string,
    unit: { unit_identifier: string; bedrooms?: number; bathrooms?: number; monthly_rent: number },
  ) {
    const client = this.getClient();
    const landlordId = await this.getLandlordProfileId(landlordUserId);
    await this.assertPropertyOwnership(landlordId, propertyId);

    const { data, error } = await client
      .from('units')
      .insert([
        {
          property_id: propertyId,
          unit_identifier: unit.unit_identifier,
          bedrooms: unit.bedrooms ?? null,
          bathrooms: unit.bathrooms ?? null,
          monthly_rent: unit.monthly_rent,
          is_occupied: false,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateUnit(
    landlordUserId: string,
    unitId: string,
    updates: { unit_identifier?: string; bedrooms?: number; bathrooms?: number; monthly_rent?: number; is_occupied?: boolean },
  ) {
    const client = this.getClient();
    const landlordId = await this.getLandlordProfileId(landlordUserId);
    await this.assertUnitOwnership(landlordId, unitId);

    const { data, error } = await client.from('units').update(updates).eq('id', unitId).select().single();
    if (error) throw error;
    return data;
  }

  private async assertPropertyOwnership(landlordId: string, propertyId: string) {
    const client = this.getClient();
    const { data, error } = await client.from('properties').select('id').eq('id', propertyId).eq('landlord_id', landlordId).single();
    if (error || !data) {
      throw new NotFoundException('Property not found');
    }
  }

  private async assertUnitOwnership(landlordId: string, unitId: string) {
    const client = this.getClient();
    const { data: unit, error: unitError } = await client.from('units').select('property_id').eq('id', unitId).single();
    if (unitError || !unit) {
      throw new NotFoundException('Unit not found');
    }
    await this.assertPropertyOwnership(landlordId, unit.property_id);
  }
}
