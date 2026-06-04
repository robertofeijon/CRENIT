import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ConsentService } from '../market-intelligence/consent.service';
import { ensureUserProfile, resolveProfileRole } from '../supabase/supabase.utils';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly consentService: ConsentService,
    private readonly notificationsService: NotificationsService,
  ) {}

  getWelcomeMessage(): string {
    return 'CRENIT auth service is available.';
  }

  private async findExistingUserByEmail(email: string) {
    const client = this.supabase.getClient();
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) return null;

    const adminApi = client.auth.admin as any;
    if (typeof adminApi.getUserByEmail === 'function') {
      const result = await adminApi.getUserByEmail(normalizedEmail).catch(() => null);
      return result?.data?.user ?? null;
    }

    if (typeof adminApi.listUsers === 'function') {
      const result = await adminApi.listUsers({ query: normalizedEmail }).catch(() => null);
      const users = result?.data?.users ?? [];
      return users.find((user: any) => user.email?.toLowerCase() === normalizedEmail) ?? null;
    }

    return null;
  }

  async register(payload: {
    email: string;
    password: string;
    full_name: string;
    role?: string;
    market_data_consent?: boolean;
  }) {
    const client = this.supabase.getClient();
    const normalizedEmail = payload.email?.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException('Email is required');
    }
    if (!payload.password || payload.password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters.');
    }
    if (!payload.full_name?.trim()) {
      throw new BadRequestException('Full name is required.');
    }

    const existingUser = await this.findExistingUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new BadRequestException('Email already registered. Please log in instead.');
    }

    const res = await client.auth.admin.createUser({
      email: normalizedEmail,
      password: payload.password,
      email_confirm: true,
      user_metadata: { role: payload.role || 'TENANT' },
    });

    if (res.error) {
      const msg = res.error.message || 'Registration failed.';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
        throw new BadRequestException('Email already registered. Please log in instead.');
      }
      if (msg.toLowerCase().includes('password')) {
        throw new BadRequestException('Password must be at least 6 characters.');
      }
      throw new BadRequestException(msg);
    }

    const user = (res as any).data?.user ?? null;
    if (!user) throw new BadRequestException('Failed to create account. Check API configuration.');

    const requestedRole = (payload.role || 'TENANT').toString().toUpperCase();
    const role = ['TENANT', 'LANDLORD'].includes(requestedRole) ? requestedRole : 'TENANT';

    const profilePayload: Record<string, unknown> = {
      id: user.id,
      full_name: payload.full_name.trim(),
      role,
      kyc_status: role === 'TENANT' ? 'NOT_SUBMITTED' : 'NOT_SUBMITTED',
    };
    if (role === 'LANDLORD') {
      profilePayload.partner_approval_status = 'UNVERIFIED';
    }

    const profileRes = await client.from('profiles').upsert([profilePayload], { onConflict: 'id' });
    if (profileRes.error) {
      const missingPartnerCol =
        profileRes.error.code === '42703' || profileRes.error.message?.includes('partner_approval_status');
      if (missingPartnerCol && role === 'LANDLORD') {
        const { partner_approval_status: _removed, ...withoutPartner } = profilePayload;
        const retry = await client.from('profiles').upsert([withoutPartner], { onConflict: 'id' });
        if (retry.error) {
          this.logger.error(`Profile upsert failed: ${retry.error.message}`);
          throw new BadRequestException('Account created but profile setup failed. Contact support.');
        }
      } else {
        this.logger.error(`Profile upsert failed: ${profileRes.error.message}`);
        throw new BadRequestException(profileRes.error.message || 'Account created but profile setup failed.');
      }
    }

    if (role === 'LANDLORD') {
      const landlordRes = await client.from('landlord_profiles').upsert(
        [
          {
            user_id: user.id,
            business_name: payload.full_name.trim(),
            partner_status: 'PENDING',
          },
        ],
        { onConflict: 'user_id' },
      );
      if (landlordRes.error) {
        this.logger.warn(`Landlord profile upsert: ${landlordRes.error.message}`);
      }
    }

    if (payload.market_data_consent) {
      const consentType = role === 'LANDLORD' ? 'LANDLORD_MARKET_DATA' : 'TENANT_MARKET_DATA';
      await this.consentService.grantConsent(user.id, consentType);
    }

    this.logger.log(`Registered user ${payload.email} -> ${user.id}`);

    return { user, error: null };
  }

  async login(payload: { email: string; password: string }) {
    const email = payload.email?.toString().trim().toLowerCase();
    const password = payload.password?.toString();
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    const res = await this.supabase.getAuthClient().auth.signInWithPassword({ email, password });

    if (res.error) throw res.error;
    return res;
  }

  async getProfileByToken(token: string) {
    const client = this.supabase.getClient();

    const { data: authData, error: authError } = await client.auth.getUser(token);
    if (authError || !authData.user) {
      throw authError || new Error('Unable to validate auth token');
    }

    const user = authData.user;
    const profile = await ensureUserProfile(client, user);
    const role = resolveProfileRole(profile, user.email);

    return { user, profile: { ...profile, role } };
  }

  async getTwoFactorStatus(userId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client.from('profiles').select('two_factor_enabled, two_factor_secret').eq('id', userId).single();
    if (error) throw error;
    return {
      enabled: Boolean(data?.two_factor_enabled),
      pending_setup: Boolean(data?.two_factor_secret && !data?.two_factor_enabled),
    };
  }

  async getInvitationByToken(token: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client.from('tenant_invitations').select('*').eq('token', token).single();
    if (error || !data) {
      throw new NotFoundException('Invitation not found');
    }

    const existingUser = await this.findExistingUserByEmail(data.invited_email);
    let landlordName: string | null = null;
    let unitLabel: string | null = null;

    if (data.landlord_id) {
      const { data: landlord } = await client
        .from('landlord_profiles')
        .select('business_name')
        .eq('id', data.landlord_id)
        .maybeSingle();
      landlordName = landlord?.business_name ?? null;
    }

    if (data.unit_id) {
      const { data: unit } = await client.from('units').select('id, unit_identifier, property_id, is_occupied').eq('id', data.unit_id).maybeSingle();
      unitLabel = unit?.unit_identifier ?? null;
      if (!unit) {
        throw new BadRequestException('Invite unit is invalid. Contact your landlord.');
      }
      const { data: property } = await client.from('properties').select('landlord_id').eq('id', unit.property_id).maybeSingle();
      if (!property?.landlord_id) {
        throw new BadRequestException('Invite unit is not linked to a verified landlord. Contact your landlord.');
      }
      if (unit.is_occupied) {
        const { data: activeLease } = await client
          .from('leases')
          .select('id')
          .eq('unit_id', unit.id)
          .eq('status', 'ACTIVE')
          .limit(1);
        if ((activeLease || []).length > 0) {
          throw new BadRequestException('Invite unit is already occupied. Contact your landlord.');
        }
      }
    }

    return {
      ...data,
      landlord_name: landlordName,
      unit_label: unitLabel,
      has_existing_account: Boolean(existingUser),
    };
  }

  async acceptInvitation(token: string, payload: { password?: string; full_name: string }) {
    const client = this.supabase.getClient();
    const invitationResult = await client.from('tenant_invitations').select('*').eq('token', token).single();
    if (invitationResult.error || !invitationResult.data) {
      throw new NotFoundException('Invitation not found');
    }

    const invitation = invitationResult.data as any;
    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Invitation is not pending');
    }

    const expiresAt = new Date(invitation.expires_at).getTime();
    if (expiresAt < Date.now()) {
      throw new BadRequestException('Invitation has expired');
    }

    const normalizedEmail = invitation.invited_email?.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException('Invitation email is invalid');
    }

    let tenantId: string;
    const existingUser = await this.findExistingUserByEmail(normalizedEmail);
    if (existingUser) {
      const profile = await ensureUserProfile(client, existingUser);
      tenantId = profile.id;
      if (payload.full_name?.trim()) {
        await client.from('profiles').update({ full_name: payload.full_name.trim() }).eq('id', tenantId);
      }
    } else {
      if (!payload.password) {
        throw new BadRequestException('Password is required for new account registration');
      }
      const res = await client.auth.admin.createUser({
        email: normalizedEmail,
        password: payload.password,
        email_confirm: true,
        user_metadata: { role: 'TENANT' },
      });
      if (res.error) {
        throw res.error;
      }
      const user = (res as any).data?.user ?? null;
      if (!user) {
        throw new Error('Failed to create user via Supabase admin API');
      }
      tenantId = user.id;
      await client.from('profiles').upsert(
        [
          {
            id: tenantId,
            full_name: payload.full_name,
            role: 'TENANT',
            kyc_status: 'NOT_SUBMITTED',
          },
        ],
        { onConflict: 'id' },
      );
    }

    const updatePayload: any = {
      status: 'ACCEPTED',
      accepted_by: tenantId,
      accepted_at: new Date().toISOString(),
    };
    const { error: updateError } = await client.from('tenant_invitations').update(updatePayload).eq('token', token);
    if (updateError) {
      throw updateError;
    }

    const { data: landlordProfile } = invitation.landlord_id
      ? await client.from('landlord_profiles').select('id, user_id, business_name').eq('id', invitation.landlord_id).maybeSingle()
      : { data: null };

    if (landlordProfile?.user_id) {
      await this.notificationsService.createNotification({
        user_id: landlordProfile.user_id,
        type: 'INVITE_ACCEPTED',
        title: 'Tenant invitation accepted',
        message: `${payload.full_name} accepted an invitation${landlordProfile.business_name ? ` for ${landlordProfile.business_name}` : ''}.`,
        metadata: {
          invitation_token: token,
          tenant_id: tenantId,
          unit_id: invitation.unit_id ?? null,
        },
      });
    }

    await this.notificationsService.createNotification({
      user_id: tenantId,
      type: 'INVITE_ACCEPTED',
      title: 'Welcome to CRENIT',
      message: 'Your tenant invitation has been accepted and your onboarding is now active.',
      metadata: {
        invitation_token: token,
        landlord_id: invitation.landlord_id ?? null,
        unit_id: invitation.unit_id ?? null,
      },
    });

    let lease = null;
    if (invitation.unit_id) {
      const { data: unitValidation } = await client
        .from('units')
        .select('id, property_id, is_occupied')
        .eq('id', invitation.unit_id)
        .maybeSingle();
      if (!unitValidation) {
        throw new BadRequestException('Invite unit is invalid. Contact your landlord.');
      }
      const { data: propertyValidation } = await client
        .from('properties')
        .select('landlord_id')
        .eq('id', unitValidation.property_id)
        .maybeSingle();
      if (!propertyValidation?.landlord_id) {
        throw new BadRequestException('Invite unit is not linked to a verified landlord. Contact your landlord.');
      }
      if (unitValidation.is_occupied) {
        const { data: activeLease } = await client
          .from('leases')
          .select('id, tenant_id')
          .eq('unit_id', invitation.unit_id)
          .eq('status', 'ACTIVE')
          .limit(1);
        if ((activeLease || []).some((lease: any) => lease.tenant_id !== tenantId)) {
          throw new BadRequestException('Invite unit is already occupied. Contact your landlord.');
        }
      }

      const { data: existingLease, error: leaseError } = await client
        .from('leases')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('unit_id', invitation.unit_id)
        .maybeSingle();
      if (leaseError) {
        throw leaseError;
      }
      if (!existingLease) {
        const { data: unit } = await client.from('units').select('id, monthly_rent, property_id').eq('id', invitation.unit_id).single();
        if (unit) {
          const { data: property } = await client.from('properties').select('landlord_id').eq('id', unit.property_id).single();
          const landlordId = property?.landlord_id || null;
          const startDate = new Date().toISOString().slice(0, 10);
          const leaseInsert = await client.from('leases').insert([
            {
              unit_id: invitation.unit_id,
              tenant_id: tenantId,
              landlord_id: landlordId,
              start_date: startDate,
              monthly_rent: unit.monthly_rent,
              status: 'ACTIVE',
            },
          ]).select().single();
          if (leaseInsert.error) {
            throw leaseInsert.error;
          }
          lease = leaseInsert.data;
          await client.from('units').update({ is_occupied: true }).eq('id', invitation.unit_id);
          await client.from('payments').insert([
            {
              lease_id: lease.id,
              tenant_id: tenantId,
              landlord_id: landlordId,
              unit_id: invitation.unit_id,
              amount_gross: Number(unit.monthly_rent || 0),
              commission_rate: 0.01,
              commission_amount: Number((Number(unit.monthly_rent || 0) * 0.01).toFixed(2)),
              amount_net: Number((Number(unit.monthly_rent || 0) * 0.99).toFixed(2)),
              due_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 10),
              payment_method: 'EFT',
              status: 'PENDING',
              is_simulated: true,
              sim_transaction_id: `INVITE-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
              notes: JSON.stringify({ source: 'invite_acceptance_seed' }),
              days_overdue: 0,
              late_fee: 0,
            },
          ]);
        }
      } else {
        lease = existingLease;
      }
    }

    return {
      tenant_id: tenantId,
      accepted: true,
      lease,
    };
  }

  async setupTwoFactor(userId: string) {
    const client = this.supabase.getClient();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const { error } = await client
      .from('profiles')
      .update({ two_factor_secret: code, two_factor_enabled: false, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) throw error;
    return {
      message: 'Enter this one-time code to confirm 2FA setup. In production this would be sent via SMS or authenticator app.',
      verification_code: code,
      pending_setup: true,
    };
  }

  async confirmTwoFactor(userId: string, code: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client.from('profiles').select('two_factor_secret').eq('id', userId).single();
    if (error || !data) throw error || new Error('Profile not found');
    if (!data.two_factor_secret || data.two_factor_secret !== code) {
      throw new Error('Invalid verification code');
    }
    const { error: updateError } = await client
      .from('profiles')
      .update({ two_factor_enabled: true, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (updateError) throw updateError;
    return { enabled: true };
  }

  async disableTwoFactor(userId: string, code: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client.from('profiles').select('two_factor_secret, two_factor_enabled').eq('id', userId).single();
    if (error || !data) throw error || new Error('Profile not found');
    if (data.two_factor_enabled && data.two_factor_secret !== code) {
      throw new Error('Invalid verification code');
    }
    const { error: updateError } = await client
      .from('profiles')
      .update({ two_factor_enabled: false, two_factor_secret: null, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (updateError) throw updateError;
    return { enabled: false };
  }

  async verifyTwoFactorCode(userId: string, code: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client.from('profiles').select('two_factor_enabled, two_factor_secret').eq('id', userId).single();
    if (error || !data) throw error || new Error('Profile not found');
    if (!data.two_factor_enabled) return { verified: true };
    if (data.two_factor_secret === code) return { verified: true };
    throw new Error('Invalid 2FA code');
  }
}
