import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SettingsService {
  constructor(private readonly supabase: SupabaseService) {}

  private getClient() {
    return this.supabase.getClient();
  }

  async getTenantSettings(userId: string) {
    const client = this.getClient();
    const [
      { data: profile, error: profileError },
      { data: methods, error: methodsError },
      { data: notificationPreferences },
    ] = await Promise.all([
      client.from('profiles').select('*').eq('id', userId).single(),
      client.from('payment_methods').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      this.ensureNotificationPreferences(userId),
    ]);

    if (profileError || !profile) throw profileError || new NotFoundException('Profile not found');
    if (methodsError) throw methodsError;

    return {
      profile: {
        full_name: profile.full_name,
        phone: profile.phone,
        email: null,
        income_monthly: profile.income_monthly,
        employer_name: profile.employer_name,
        address_street: profile.address_street,
        address_suburb: profile.address_suburb,
        address_city: profile.address_city,
        kyc_status: profile.kyc_status,
        two_factor_enabled: profile.two_factor_enabled ?? false,
      },
      payment_methods: (methods || []).map((m: any) => ({
        id: m.id,
        type: m.type,
        last_four: m.last_four,
        is_default: m.is_default,
        created_at: m.created_at,
      })),
      notification_preferences: notificationPreferences,
    };
  }

  async updateProfile(userId: string, updates: Record<string, unknown>) {
    const client = this.getClient();
    const allowed = [
      'full_name',
      'phone',
      'income_monthly',
      'employer_name',
      'address_street',
      'address_suburb',
      'address_city',
      'address_postcode',
    ];
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (updates[key] !== undefined) patch[key] = updates[key];
    }

    const { data, error } = await client.from('profiles').update(patch).eq('id', userId).select().single();
    if (error) throw error;
    return data;
  }

  async addPaymentMethod(userId: string, body: { type: 'CARD' | 'MOBILE_MONEY' | 'EFT'; details: Record<string, unknown>; is_default?: boolean }) {
    const client = this.getClient();
    const lastFour =
      body.type === 'CARD' && body.details?.card_number
        ? String(body.details.card_number).slice(-4)
        : body.type === 'MOBILE_MONEY' && body.details?.phone_number
          ? String(body.details.phone_number).slice(-4)
          : null;

    if (body.is_default) {
      await client.from('payment_methods').update({ is_default: false }).eq('user_id', userId);
    }

    const { data, error } = await client
      .from('payment_methods')
      .insert([
        {
          user_id: userId,
          type: body.type,
          details: body.details,
          last_four: lastFour,
          is_default: body.is_default ?? false,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deletePaymentMethod(userId: string, methodId: string) {
    const client = this.getClient();
    const { data, error } = await client.from('payment_methods').delete().eq('id', methodId).eq('user_id', userId).select().single();
    if (error) throw error;
    if (!data) throw new NotFoundException('Payment method not found');
    return { deleted: true };
  }

  async getLandlordSettings(userId: string) {
    const client = this.getClient();
    const { data: profile, error: profileError } = await client.from('profiles').select('*').eq('id', userId).single();
    if (profileError || !profile) throw profileError || new NotFoundException('Profile not found');

    const { data: landlord, error: landlordError } = await client.from('landlord_profiles').select('*').eq('user_id', userId).single();
    if (landlordError || !landlord) throw new NotFoundException('Landlord profile not found');

    const notificationPreferences = await this.ensureNotificationPreferences(userId);

    return {
      profile: {
        full_name: profile.full_name,
        phone: profile.phone,
        two_factor_enabled: profile.two_factor_enabled ?? false,
      },
      payout: {
        business_name: landlord.business_name,
        bank_account_name: landlord.bank_account_name,
        bank_account_number: landlord.bank_account_number,
        bank_name: landlord.bank_name,
        bank_branch_code: landlord.bank_branch_code,
        payout_email: landlord.payout_email,
        partner_status: landlord.partner_status,
      },
      notification_preferences: notificationPreferences,
    };
  }

  async updateLandlordSettings(userId: string, body: { profile?: Record<string, unknown>; payout?: Record<string, unknown> }) {
    const client = this.getClient();
    if (body.profile) {
      await this.updateProfile(userId, body.profile);
    }

    if (body.payout) {
      const { data: landlord } = await client.from('landlord_profiles').select('id').eq('user_id', userId).single();
      if (!landlord) throw new NotFoundException('Landlord profile not found');

      const allowed = ['business_name', 'bank_account_name', 'bank_account_number', 'bank_name', 'bank_branch_code', 'payout_email'];
      const patch: Record<string, unknown> = {};
      for (const key of allowed) {
        if (body.payout[key] !== undefined) patch[key] = body.payout[key];
      }

      const { data, error } = await client.from('landlord_profiles').update(patch).eq('id', landlord.id).select().single();
      if (error) throw error;
      return data;
    }

    return this.getLandlordSettings(userId);
  }

  async ensureNotificationPreferences(userId: string) {
    const client = this.getClient();
    const { data: existing, error } = await client
      .from('notification_preferences')
      .select('*')
      .eq('profile_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (existing) return existing;
    const { data: inserted, error: insertError } = await client
      .from('notification_preferences')
      .insert([{ profile_id: userId }])
      .select('*')
      .single();
    if (insertError) throw insertError;
    return inserted;
  }

  async updateNotificationPreferences(
    userId: string,
    body: {
      email_enabled?: boolean;
      sms_enabled?: boolean;
      rent_reminders?: boolean;
      payment_confirmations?: boolean;
      kyc_updates?: boolean;
      lease_events?: boolean;
      deposit_events?: boolean;
    },
  ) {
    const client = this.getClient();
    await this.ensureNotificationPreferences(userId);
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of [
      'email_enabled',
      'sms_enabled',
      'rent_reminders',
      'payment_confirmations',
      'kyc_updates',
      'lease_events',
      'deposit_events',
    ]) {
      if (body[key as keyof typeof body] !== undefined) {
        patch[key] = body[key as keyof typeof body] as unknown;
      }
    }
    const { data, error } = await client
      .from('notification_preferences')
      .update(patch)
      .eq('profile_id', userId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }
}
