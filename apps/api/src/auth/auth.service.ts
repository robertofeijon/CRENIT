import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { SupabaseService } from '../supabase/supabase.service';
import { ConsentService } from '../market-intelligence/consent.service';
import {
  ensureUserProfile,
  getAuthEmailByUserId,
  isTwoFactorSessionActive,
  mustSetupTwoFactor,
  requiresTwoFactorVerification,
  resolveProfileRole,
} from '../supabase/supabase.utils';
import { NotificationsService } from '../notifications/notifications.service';
import {
  generateSmsOtp,
  hashSmsOtp,
  isSmsOtpExpired,
  smsOtpExpiresAt,
  verifySmsOtp,
} from './sms-otp.util';
import { OnboardingEmailService } from '../notifications/onboarding-email.service';

authenticator.options = { window: 1 };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly consentService: ConsentService,
    private readonly notificationsService: NotificationsService,
    private readonly onboardingEmailService: OnboardingEmailService,
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

    if (role === 'TENANT' || role === 'LANDLORD') {
      await this.onboardingEmailService.enrollUser(user.id, role);
    }

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
    const enriched = { ...profile, role };
    const two_factor_setup_required = mustSetupTwoFactor(enriched);
    const two_factor_required =
      !two_factor_setup_required &&
      requiresTwoFactorVerification(enriched) &&
      !isTwoFactorSessionActive(enriched);

    return {
      user,
      profile: enriched,
      two_factor_required,
      two_factor_setup_required,
      two_factor_enforced: requiresTwoFactorVerification(enriched) || two_factor_setup_required,
    };
  }

  private twoFactorSessionHours(): number {
    const hours = Number(process.env.TWO_FACTOR_SESSION_HOURS || 12);
    return Number.isFinite(hours) && hours > 0 ? hours : 12;
  }

  private twoFactorVerifiedUntilIso(): string {
    const until = new Date();
    until.setHours(until.getHours() + this.twoFactorSessionHours());
    return until.toISOString();
  }

  private isLegacyDemoSecret(secret: string | null | undefined): boolean {
    return Boolean(secret && /^\d{6}$/.test(secret));
  }

  private verifyTotpCode(secret: string, code: string): boolean {
    const normalized = code.replace(/\s/g, '');
    if (this.isLegacyDemoSecret(secret)) {
      return secret === normalized;
    }
    return authenticator.check(normalized, secret);
  }

  async getLoginTwoFactorHint(userId: string, email?: string | null) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('profiles')
      .select('role, two_factor_enabled, two_factor_verified_until, partner_approval_status')
      .eq('id', userId)
      .single();
    if (error || !data) {
      return { requires_two_factor: false, two_factor_enforced: false };
    }
    const role = resolveProfileRole(data, email);
    const profile = { ...data, role };
    const enforced = requiresTwoFactorVerification(profile);
    return {
      requires_two_factor: enforced && !isTwoFactorSessionActive(profile),
      two_factor_enforced: enforced,
    };
  }

  async getTwoFactorStatus(userId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('profiles')
      .select('two_factor_enabled, two_factor_secret, two_factor_verified_until, two_factor_method, phone')
      .eq('id', userId)
      .single();
    if (error) throw error;
    const method =
      data?.two_factor_method === 'SMS'
        ? 'sms'
        : data?.two_factor_secret && !this.isLegacyDemoSecret(data.two_factor_secret)
          ? 'totp'
          : 'legacy';
    return {
      enabled: Boolean(data?.two_factor_enabled),
      pending_setup: Boolean(
        (data?.two_factor_secret && !data?.two_factor_enabled && method === 'totp') ||
          (data?.two_factor_method === 'SMS' && !data?.two_factor_enabled),
      ),
      session_active: isTwoFactorSessionActive({
        two_factor_enabled: data?.two_factor_enabled,
        two_factor_verified_until: data?.two_factor_verified_until,
      }),
      method,
      phone_masked: data?.phone ? `${data.phone.slice(0, 3)}***${data.phone.slice(-2)}` : null,
      sms_available: process.env.SMS_ENABLED === 'true',
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
    const email = (await getAuthEmailByUserId(client, userId)) || userId;
    const secret = authenticator.generateSecret();
    const otpauth_url = authenticator.keyuri(email, 'CRENIT', secret);
    const qr_data_url = await QRCode.toDataURL(otpauth_url);
    const { error } = await client
      .from('profiles')
      .update({
        two_factor_secret: secret,
        two_factor_method: 'TOTP',
        two_factor_enabled: false,
        two_factor_verified_until: null,
        sms_otp_hash: null,
        sms_otp_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    if (error) throw error;
    return {
      message: 'Scan the QR code with your authenticator app, then enter the 6-digit code to enable 2FA.',
      otpauth_url,
      qr_data_url,
      manual_entry_key: secret,
      pending_setup: true,
    };
  }

  async confirmTwoFactor(userId: string, code: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client.from('profiles').select('two_factor_secret').eq('id', userId).single();
    if (error || !data?.two_factor_secret) throw error || new Error('Profile not found');
    if (!this.verifyTotpCode(data.two_factor_secret, code)) {
      throw new Error('Invalid verification code');
    }
    const verifiedUntil = this.twoFactorVerifiedUntilIso();
    const { error: updateError } = await client
      .from('profiles')
      .update({
        two_factor_enabled: true,
        two_factor_method: 'TOTP',
        two_factor_verified_until: verifiedUntil,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    if (updateError) throw updateError;
    return { enabled: true, verified_until: verifiedUntil };
  }

  async setupSmsTwoFactor(userId: string) {
    if (process.env.SMS_ENABLED !== 'true') {
      throw new BadRequestException('SMS 2FA is not enabled on this environment (set SMS_ENABLED=true).');
    }
    const client = this.supabase.getClient();
    const { data: profile, error } = await client.from('profiles').select('phone').eq('id', userId).single();
    if (error || !profile?.phone?.trim()) {
      throw new BadRequestException('Add a mobile number to your profile before enabling SMS 2FA.');
    }
    const otp = generateSmsOtp();
    const { sent } = await this.notificationsService.sendTransactionalSms(
      profile.phone,
      `CRENIT verification code: ${otp}. Valid for 10 minutes.`,
    );
    await client
      .from('profiles')
      .update({
        two_factor_method: 'SMS',
        two_factor_enabled: false,
        two_factor_secret: null,
        sms_otp_hash: hashSmsOtp(userId, otp),
        sms_otp_expires_at: smsOtpExpiresAt(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    return {
      message: sent
        ? 'We sent a 6-digit code to your phone. Enter it below to enable SMS 2FA.'
        : 'SMS is not configured — code logged server-side in development.',
      pending_setup: true,
      method: 'sms',
    };
  }

  async confirmSmsTwoFactor(userId: string, code: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('profiles')
      .select('sms_otp_hash, sms_otp_expires_at, two_factor_method')
      .eq('id', userId)
      .single();
    if (error || !data) throw error || new BadRequestException('Profile not found');
    if (data.two_factor_method !== 'SMS') throw new BadRequestException('Start SMS 2FA setup first.');
    if (isSmsOtpExpired(data.sms_otp_expires_at)) throw new BadRequestException('Code expired — request a new one.');
    if (!verifySmsOtp(userId, code, data.sms_otp_hash)) throw new BadRequestException('Invalid verification code');
    const verifiedUntil = this.twoFactorVerifiedUntilIso();
    const { error: updateError } = await client
      .from('profiles')
      .update({
        two_factor_enabled: true,
        two_factor_method: 'SMS',
        two_factor_verified_until: verifiedUntil,
        sms_otp_hash: null,
        sms_otp_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    if (updateError) throw updateError;
    return { enabled: true, verified_until: verifiedUntil, method: 'sms' };
  }

  async sendSmsTwoFactorChallenge(userId: string) {
    if (process.env.SMS_ENABLED !== 'true') {
      throw new BadRequestException('SMS 2FA is not enabled on this environment.');
    }
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('profiles')
      .select('phone, two_factor_enabled, two_factor_method')
      .eq('id', userId)
      .single();
    if (error || !data?.two_factor_enabled || data.two_factor_method !== 'SMS') {
      throw new BadRequestException('SMS 2FA is not enabled for this account.');
    }
    if (!data.phone?.trim()) throw new BadRequestException('Profile phone number is missing.');
    const otp = generateSmsOtp();
    await client
      .from('profiles')
      .update({
        sms_otp_hash: hashSmsOtp(userId, otp),
        sms_otp_expires_at: smsOtpExpiresAt(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    const { sent } = await this.notificationsService.sendTransactionalSms(
      data.phone,
      `CRENIT login code: ${otp}. Valid for 10 minutes.`,
    );
    return { sent, message: sent ? 'Code sent.' : 'SMS not delivered — check server logs.' };
  }

  async disableTwoFactor(userId: string, code: string) {
    if (!code?.trim()) throw new BadRequestException('Verification code is required to disable 2FA.');
    await this.verifyTwoFactorCode(userId, code.trim());
    const client = this.supabase.getClient();
    const { error: updateError } = await client
      .from('profiles')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_method: null,
        two_factor_verified_until: null,
        sms_otp_hash: null,
        sms_otp_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    if (updateError) throw updateError;
    return { enabled: false };
  }

  async verifyTwoFactorCode(userId: string, code: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('profiles')
      .select('two_factor_enabled, two_factor_secret, two_factor_method, sms_otp_hash, sms_otp_expires_at')
      .eq('id', userId)
      .single();
    if (error || !data) throw error || new Error('Profile not found');
    if (!data.two_factor_enabled) return { verified: true };
    if (data.two_factor_method === 'SMS') {
      if (isSmsOtpExpired(data.sms_otp_expires_at)) throw new BadRequestException('SMS code expired — request a new one.');
      if (verifySmsOtp(userId, code, data.sms_otp_hash)) return { verified: true };
      throw new Error('Invalid 2FA code');
    }
    if (data.two_factor_secret && this.verifyTotpCode(data.two_factor_secret, code)) {
      return { verified: true };
    }
    throw new Error('Invalid 2FA code');
  }

  async verifyTwoFactorSession(userId: string, code: string) {
    await this.verifyTwoFactorCode(userId, code);
    const client = this.supabase.getClient();
    const verifiedUntil = this.twoFactorVerifiedUntilIso();
    const { error } = await client
      .from('profiles')
      .update({
        two_factor_verified_until: verifiedUntil,
        sms_otp_hash: null,
        sms_otp_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    if (error) throw error;
    return { verified: true, verified_until: verifiedUntil };
  }
}
