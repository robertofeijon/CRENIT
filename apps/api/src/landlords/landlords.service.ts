import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { isKycApproved } from '../supabase/supabase.utils';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LandlordsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getLandlordProfile(userId: string) {
    return this.ensureLandlordProfile(userId);
  }

  async ensureLandlordProfile(userId: string, businessName?: string) {
    const client = this.supabase.getClient();
    const { data: existing } = await client.from('landlord_profiles').select('*').eq('user_id', userId).maybeSingle();
    if (existing) {
      return existing;
    }

    const { data: created, error } = await client
      .from('landlord_profiles')
      .insert([
        {
          user_id: userId,
          business_name: businessName || 'My Portfolio',
          partner_status: 'APPROVED',
        },
      ])
      .select()
      .single();

    if (error) {
      const { data: existingAfter, error: existingAfterError } = await client
        .from('landlord_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!existingAfterError && existingAfter) {
        return existingAfter;
      }

      throw error;
    }

    if (!created) {
      throw new NotFoundException('Unable to create landlord profile');
    }

    return created;
  }

  private async assertLandlordKycApproved(userId: string) {
    const client = this.supabase.getClient();
    const { data: profile, error } = await client.from('profiles').select('kyc_status').eq('id', userId).single();
    if (error || !profile || !isKycApproved(profile)) {
      throw new UnauthorizedException('Landlord KYC must be approved before inviting tenants or adding properties');
    }
  }

  async buildOverview(userId: string) {
    const client = this.supabase.getClient();
    const landlordProfile = await this.ensureLandlordProfile(userId);
    const landlordId = landlordProfile.id;

    const [propertiesRes, leasesRes, paymentsRes, depositsRes] = await Promise.all([
      client.from('properties').select('*, units(*)').eq('landlord_id', landlordId),
      client.from('leases').select('*').eq('landlord_id', landlordId),
      client.from('payments').select('*').eq('landlord_id', landlordId).order('created_at', { ascending: false }).limit(10),
      client.from('deposits').select('*').eq('landlord_id', landlordId),
    ]);

    if (propertiesRes.error || leasesRes.error || paymentsRes.error || depositsRes.error) {
      throw propertiesRes.error || leasesRes.error || paymentsRes.error || depositsRes.error;
    }

    const properties = propertiesRes.data || [];
    const leases = leasesRes.data || [];
    const payments = paymentsRes.data || [];
    const deposits = depositsRes.data || [];

    const activeLeases = leases.filter((lease: any) => lease.status === 'ACTIVE');
    const activeTenants = new Set(activeLeases.map((lease: any) => lease.tenant_id)).size;
    const monthlyRentExpected = activeLeases.reduce((sum: number, lease: any) => sum + Number(lease.monthly_rent || 0), 0);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const collectedThisMonth = payments
      .filter((payment: any) => payment.paid_date && payment.status === 'PAID')
      .filter((payment: any) => {
        const paidDate = new Date(payment.paid_date);
        return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
      })
      .reduce((sum: number, payment: any) => sum + Number(payment.amount_gross || 0), 0);

    const outstanding = payments
      .filter((payment: any) => payment.status !== 'PAID')
      .reduce((sum: number, payment: any) => sum + Number(payment.amount_gross || 0), 0);

    const commissionEarnedThisMonth = payments
      .filter((payment: any) => payment.paid_date && payment.status === 'PAID')
      .filter((payment: any) => {
        const paidDate = new Date(payment.paid_date);
        return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
      })
      .reduce((sum: number, payment: any) => sum + Number(payment.commission_amount || 0), 0);
    const awaitingDirectConfirmations = payments.filter(
      (payment: any) => payment.payment_method === 'DIRECT' && payment.status === 'PENDING',
    ).length;

    const tenantIds = Array.from(new Set(leases.map((lease: any) => lease.tenant_id))).filter(Boolean);
    const tenantsData = tenantIds.length
      ? await client.from('profiles').select('id, full_name, kyc_status, role').in('id', tenantIds)
      : { data: [], error: null };

    if (tenantsData.error) {
      throw tenantsData.error;
    }

    const tenantsById = new Map((tenantsData.data || []).map((profile: any) => [profile.id, profile]));

    const tenantSummaries = leases.map((lease: any) => ({
      leaseId: lease.id,
      tenantId: lease.tenant_id,
      tenantName: tenantsById.get(lease.tenant_id)?.full_name || 'Unknown Tenant',
      kycStatus: tenantsById.get(lease.tenant_id)?.kyc_status || 'NOT_SUBMITTED',
      status: lease.status,
      monthlyRent: lease.monthly_rent,
      unitId: lease.unit_id,
      startDate: lease.start_date,
      endDate: lease.end_date,
    }));

    const depositSummary = {
      totalDeposits: deposits.length,
      held: deposits.filter((row: any) => row.status === 'HELD').length,
      refundPending: deposits.filter((row: any) => row.status === 'REFUND_PENDING').length,
      disputed: deposits.filter((row: any) => row.status === 'DISPUTED').length,
      refunded: deposits.filter((row: any) => row.status === 'REFUNDED').length,
      totalValue: deposits.reduce((sum: number, deposit: any) => sum + Number(deposit.amount || 0), 0),
    };

    return {
      landlord: {
        id: landlordProfile.id,
        businessName: landlordProfile.business_name,
        partnerStatus: landlordProfile.partner_status,
      },
      stats: {
        totalProperties: properties.length,
        activeTenants,
        monthlyRentExpected,
        collectedThisMonth,
        outstanding,
        commissionEarnedThisMonth,
        awaitingDirectConfirmations,
      },
      properties,
      tenants: tenantSummaries,
      recentPayments: payments,
      depositSummary,
    };
  }

  async listTenants(landlordUserId: string) {
    const client = this.supabase.getClient();
    const landlordProfile = await this.ensureLandlordProfile(landlordUserId);
    const landlordId = landlordProfile.id;

    const { data: leases, error: leasesError } = await client
      .from('leases')
      .select('id, tenant_id, unit_id, monthly_rent, payment_method, status, start_date, end_date')
      .eq('landlord_id', landlordId);

    if (leasesError) {
      throw leasesError;
    }

    const tenantIds = Array.from(new Set((leases || []).map((lease: any) => lease.tenant_id))).filter(Boolean);
    const tenantsData = tenantIds.length
      ? await client.from('profiles').select('id, full_name, kyc_status, kyc_rejection_reason').in('id', tenantIds)
      : { data: [], error: null };

    if (tenantsData.error) {
      throw tenantsData.error;
    }

    const tenantsById = new Map((tenantsData.data || []).map((profile: any) => [profile.id, profile]));
    const tenantMap = new Map<string, any>();

    (leases || []).forEach((lease: any) => {
      if (!tenantMap.has(lease.tenant_id)) {
        tenantMap.set(lease.tenant_id, {
          leaseId: lease.id,
          tenantId: lease.tenant_id,
          tenantName: tenantsById.get(lease.tenant_id)?.full_name || 'Unknown Tenant',
          kycStatus: tenantsById.get(lease.tenant_id)?.kyc_status || 'NOT_SUBMITTED',
          unitId: lease.unit_id,
          monthlyRent: lease.monthly_rent,
          payment_method: lease.payment_method || 'PLATFORM',
          status: lease.status,
          startDate: lease.start_date,
          endDate: lease.end_date,
        });
      }
    });

    return Array.from(tenantMap.values());
  }

  async getTenantReview(landlordUserId: string, tenantId: string) {
    const client = this.supabase.getClient();
    const landlordProfile = await this.ensureLandlordProfile(landlordUserId);
    const landlordId = landlordProfile.id;

    const { data: leases, error: leasesError } = await client
      .from('leases')
      .select('id, tenant_id, unit_id, monthly_rent, payment_method, status, start_date, end_date')
      .eq('landlord_id', landlordId)
      .eq('tenant_id', tenantId);

    if (leasesError) {
      throw leasesError;
    }

    if (!leases || leases.length === 0) {
      throw new NotFoundException('Tenant not found for this landlord');
    }

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id, full_name, kyc_status, income_monthly, kyc_rejection_reason')
      .eq('id', tenantId)
      .single();

    if (profileError) {
      throw profileError;
    }

    const { data: documents, error: docsError } = await client
      .from('kyc_documents')
      .select('file_name, storage_path, uploaded_at')
      .eq('user_id', tenantId)
      .order('uploaded_at', { ascending: false });

    if (docsError) {
      throw docsError;
    }

    const docsWithUrls = (documents || []).map((doc: any) => {
      const publicUrl = client.storage.from('kyc-documents').getPublicUrl(doc.storage_path).data.publicUrl;
      return {
        ...doc,
        publicUrl,
      };
    });

    const { data: score } = await client
      .from('credit_scores')
      .select('id, score, tier, calculation_date, payment_history_score, streak_score, history_length_score, income_rent_ratio_score, deposit_management_score')
      .eq('tenant_id', tenantId)
      .eq('is_current', true)
      .order('calculation_date', { ascending: false })
      .maybeSingle();

    return {
      profile,
      leases,
      score: score || null,
      documents: docsWithUrls,
      kycAudit: await (async () => {
        const { data } = await client
          .from('kyc_audit_log')
          .select('id, action, previous_status, next_status, reason, created_at, actor_id')
          .eq('user_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(10);
        return data || [];
      })(),
    };
  }

  async updateTenantKycStatus(landlordUserId: string, tenantId: string, status: string, reason?: string) {
    const client = this.supabase.getClient();
    const landlordProfile = await this.ensureLandlordProfile(landlordUserId);
    const landlordId = landlordProfile.id;

    const { data: lease, error: leaseError } = await client
      .from('leases')
      .select('id')
      .eq('landlord_id', landlordId)
      .eq('tenant_id', tenantId)
      .limit(1)
      .single();

    if (leaseError || !lease) {
      throw new NotFoundException('Tenant not found for this landlord');
    }

    const { data: currentProfile } = await client.from('profiles').select('kyc_status').eq('id', tenantId).maybeSingle();

    const updatePayload: any = {
      kyc_status: status,
      kyc_reviewed_at: new Date().toISOString(),
      kyc_reviewer_id: landlordProfile.user_id,
    };
    if (status === 'REJECTED') {
      updatePayload.kyc_rejection_reason = reason || null;
    } else {
      updatePayload.kyc_rejection_reason = null;
    }

    const { error: updateError } = await client.from('profiles').update(updatePayload).eq('id', tenantId);
    if (updateError) {
      throw updateError;
    }

    const { data: updatedProfile, error: profileError } = await client
      .from('profiles')
      .select('id, full_name, kyc_status, income_monthly, kyc_rejection_reason')
      .eq('id', tenantId)
      .single();

    if (profileError) {
      throw profileError;
    }

    await client.from('kyc_audit_log').insert([
      {
        user_id: tenantId,
        actor_id: landlordProfile.user_id,
        action: status === 'REJECTED' ? 'KYC_REJECTED' : status === 'APPROVED' ? 'KYC_APPROVED' : 'KYC_STATUS_UPDATED',
        previous_status: currentProfile?.kyc_status ?? null,
        next_status: status,
        reason: reason || null,
        metadata: { landlord_profile_id: landlordId },
      },
    ]);

    await this.notificationsService.createNotification({
      user_id: tenantId,
      type: status === 'APPROVED' ? 'KYC_APPROVED' : status === 'REJECTED' ? 'KYC_REJECTED' : 'KYC_STATUS_UPDATED',
      title: status === 'APPROVED' ? 'KYC approved' : status === 'REJECTED' ? 'KYC requires action' : 'KYC status updated',
      message:
        status === 'APPROVED'
          ? 'Your identity has been verified — your RentCredit Score is now active.'
          : status === 'REJECTED'
            ? `Action required: your KYC submission needs attention.${reason ? ` Reason: ${reason}` : ''}`
            : `Your KYC status is now ${status}.`,
      metadata: { status, reason: reason || null },
    });

    return updatedProfile;
  }

  async inviteTenant(
    landlordUserId: string,
    payload: { email: string; full_name: string; unit_id?: string },
  ) {
    const client = this.supabase.getClient();
    await this.assertLandlordKycApproved(landlordUserId);
    const landlordProfile = await this.ensureLandlordProfile(landlordUserId);

    const normalizedEmail = payload.email?.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException('Tenant email is required');
    }

    const adminApi = client.auth.admin as any;
    const existingUser =
      typeof adminApi.getUserByEmail === 'function'
        ? await adminApi.getUserByEmail(normalizedEmail).catch(() => null)
        : await adminApi.listUsers({ query: normalizedEmail }).catch(() => null);
    const existingTenant =
      existingUser?.data?.user ??
      (existingUser?.data?.users || []).find((u: any) => u.email?.toLowerCase() === normalizedEmail) ??
      null;
    let tenantId: string | null = null;

    if (existingTenant) {
      const { data: profile, error: profileError } = await client.from('profiles').select('id, role').eq('id', existingTenant.id).single();
      if (profileError) {
        throw profileError;
      }
      if (!profile || (profile.role !== 'TENANT' && profile.role !== 'BOTH')) {
        throw new BadRequestException('Existing account is not a tenant profile');
      }
      tenantId = profile.id;
    }

    const { data: existingPendingInvite } = await client
      .from('tenant_invitations')
      .select('id, token, expires_at')
      .eq('invited_email', normalizedEmail)
      .eq('landlord_id', landlordProfile.id)
      .eq('status', 'PENDING')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (existingPendingInvite) {
      return {
        tenant: {
          id: tenantId,
          email: normalizedEmail,
          full_name: payload.full_name,
        },
        invite: {
          token: existingPendingInvite.token,
          invite_url: `/join/${existingPendingInvite.token}`,
          expires_at: existingPendingInvite.expires_at,
          status: 'PENDING',
          reused_existing: true,
        },
      };
    }

    const inviteToken = Math.random().toString(36).slice(2, 10).toUpperCase();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const invitePayload: any = {
      landlord_id: landlordProfile.id,
      unit_id: payload.unit_id || null,
      invited_email: normalizedEmail,
      token: inviteToken,
      status: 'PENDING',
      expires_at: expiresAt,
    };

    const { error: inviteError } = await client.from('tenant_invitations').insert([invitePayload]);
    if (inviteError) {
      throw inviteError;
    }

    await this.notificationsService.createNotification({
      user_id: landlordUserId,
      type: 'INVITE_SENT',
      title: 'Tenant invite sent',
      message: `Invitation sent to ${normalizedEmail}.`,
      metadata: { invited_email: normalizedEmail, unit_id: payload.unit_id ?? null, landlord_profile_id: landlordProfile.id },
    });

    if (tenantId) {
      await this.notificationsService.createNotification({
        user_id: tenantId,
        type: 'INVITE_SENT',
        title: 'You have been invited',
        message: 'A landlord invited you to join a rental unit on RentCredit.',
        metadata: { invited_email: normalizedEmail, unit_id: payload.unit_id ?? null, token: inviteToken },
      });
    }

    return {
      tenant: {
        id: tenantId,
        email: normalizedEmail,
        full_name: payload.full_name,
      },
      invite: {
        token: inviteToken,
        invite_url: `/join/${inviteToken}`,
        expires_at: expiresAt,
        status: 'PENDING',
        existing_account: Boolean(existingTenant),
      },
    };
  }

  async listInvites(landlordUserId: string) {
    const client = this.supabase.getClient();
    const landlordProfile = await this.ensureLandlordProfile(landlordUserId);

    const { data, error } = await client
      .from('tenant_invitations')
      .select('id, invited_email, token, status, unit_id, expires_at, accepted_at, created_at')
      .eq('landlord_id', landlordProfile.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const unitIds = Array.from(new Set((data || []).map((invite: any) => invite.unit_id))).filter(Boolean);
    const unitsRes = unitIds.length
      ? await client.from('units').select('id, unit_identifier').in('id', unitIds)
      : { data: [], error: null };
    if (unitsRes.error) throw unitsRes.error;
    const unitById = new Map((unitsRes.data || []).map((unit: any) => [unit.id, unit]));

    return (data || []).map((invite: any) => ({
      ...invite,
      invite_url: `/join/${invite.token}`,
      unit_label: unitById.get(invite.unit_id)?.unit_identifier ?? null,
      is_expired: invite.expires_at ? new Date(invite.expires_at).getTime() < Date.now() : false,
    }));
  }

  async cancelInvite(landlordUserId: string, inviteId: string) {
    const client = this.supabase.getClient();
    const landlordProfile = await this.ensureLandlordProfile(landlordUserId);
    const { data: invite, error: inviteErr } = await client
      .from('tenant_invitations')
      .select('*')
      .eq('id', inviteId)
      .eq('landlord_id', landlordProfile.id)
      .single();
    if (inviteErr || !invite) throw new NotFoundException('Invite not found');
    if (invite.status !== 'PENDING') throw new BadRequestException('Only pending invites can be cancelled');

    const { data: updated, error } = await client
      .from('tenant_invitations')
      .update({ status: 'EXPIRED' })
      .eq('id', inviteId)
      .select('*')
      .single();
    if (error) throw error;
    return updated;
  }

  async resendInvite(landlordUserId: string, inviteId: string) {
    const client = this.supabase.getClient();
    const landlordProfile = await this.ensureLandlordProfile(landlordUserId);
    const { data: invite, error: inviteErr } = await client
      .from('tenant_invitations')
      .select('*')
      .eq('id', inviteId)
      .eq('landlord_id', landlordProfile.id)
      .single();
    if (inviteErr || !invite) throw new NotFoundException('Invite not found');
    if (invite.status === 'ACCEPTED') throw new BadRequestException('Accepted invites cannot be resent');

    const newToken = Math.random().toString(36).slice(2, 10).toUpperCase();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: updated, error } = await client
      .from('tenant_invitations')
      .update({ token: newToken, status: 'PENDING', expires_at: expiresAt })
      .eq('id', inviteId)
      .select('*')
      .single();
    if (error) throw error;

    await this.notificationsService.createNotification({
      user_id: landlordUserId,
      type: 'INVITE_RESENT',
      title: 'Tenant invite resent',
      message: `Invitation resent to ${invite.invited_email}.`,
      metadata: { invite_id: inviteId, invited_email: invite.invited_email, token: newToken },
    });

    return {
      ...updated,
      invite_url: `/join/${newToken}`,
    };
  }

  async listRenewals(landlordUserId: string) {
    const client = this.supabase.getClient();
    const landlordProfile = await this.ensureLandlordProfile(landlordUserId);
    const { data, error } = await client
      .from('lease_renewals')
      .select('*')
      .eq('landlord_id', landlordProfile.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async respondToRenewal(
    landlordUserId: string,
    renewalId: string,
    payload: { action: 'APPROVE' | 'REJECT' | 'COUNTER'; proposed_rent?: number; proposed_end_date?: string },
  ) {
    const client = this.supabase.getClient();
    const landlordProfile = await this.ensureLandlordProfile(landlordUserId);
    const { data: renewal, error: renewalErr } = await client
      .from('lease_renewals')
      .select('*')
      .eq('id', renewalId)
      .eq('landlord_id', landlordProfile.id)
      .single();
    if (renewalErr || !renewal) throw new NotFoundException('Renewal proposal not found');

    let status = renewal.status;
    const updates: Record<string, unknown> = {};
    if (payload.action === 'APPROVE') {
      status = 'APPROVED';
    } else if (payload.action === 'REJECT') {
      status = 'REJECTED';
    } else {
      status = 'PENDING_APPROVAL';
      if (payload.proposed_rent != null) updates.proposed_rent = payload.proposed_rent;
      if (payload.proposed_end_date) updates.proposed_end_date = payload.proposed_end_date;
    }
    updates.status = status;

    const { data: updated, error } = await client.from('lease_renewals').update(updates).eq('id', renewalId).select('*').single();
    if (error || !updated) throw error || new Error('Unable to update renewal proposal');

    if (status === 'APPROVED' && renewal.lease_id) {
      await client
        .from('leases')
        .update({
          end_date: updated.proposed_end_date ?? renewal.end_date ?? null,
          monthly_rent: updated.proposed_rent ?? renewal.proposed_rent ?? renewal.monthly_rent ?? null,
        })
        .eq('id', renewal.lease_id);
    }

    if (renewal.tenant_id) {
      await this.notificationsService.createNotification({
        user_id: renewal.tenant_id,
        type: 'LEASE_RENEWAL_UPDATED',
        title: 'Lease renewal update',
        message: `Your landlord has ${payload.action.toLowerCase()}d the lease renewal proposal.`,
        metadata: { renewal_id: renewalId, action: payload.action, status },
      });
    }

    return updated;
  }

  async listLeases(landlordUserId: string) {
    const client = this.supabase.getClient();
    const landlordProfile = await this.ensureLandlordProfile(landlordUserId);
    const landlordId = landlordProfile.id;

    const { data: leases, error: leasesError } = await client
      .from('leases')
      .select('id, unit_id, tenant_id, monthly_rent, payment_method, start_date, end_date, status, created_at')
      .eq('landlord_id', landlordId)
      .order('created_at', { ascending: false });

    if (leasesError) {
      throw leasesError;
    }

    const unitIds = Array.from(new Set((leases || []).map((lease: any) => lease.unit_id))).filter(Boolean);
    const tenantIds = Array.from(new Set((leases || []).map((lease: any) => lease.tenant_id))).filter(Boolean);

    const [unitsRes, tenantsRes] = await Promise.all([
      unitIds.length ? client.from('units').select('id, unit_identifier').in('id', unitIds) : { data: [], error: null },
      tenantIds.length ? client.from('profiles').select('id, full_name, kyc_status').in('id', tenantIds) : { data: [], error: null },
    ]);

    if (unitsRes.error || tenantsRes.error) {
      throw unitsRes.error || tenantsRes.error;
    }

    const unitById = new Map((unitsRes.data || []).map((unit: any) => [unit.id, unit]));
    const tenantById = new Map((tenantsRes.data || []).map((tenant: any) => [tenant.id, tenant]));

    return (leases || []).map((lease: any) => ({
      ...lease,
      unit_identifier: unitById.get(lease.unit_id)?.unit_identifier || null,
      tenant_name: tenantById.get(lease.tenant_id)?.full_name || null,
      tenant_kyc_status: tenantById.get(lease.tenant_id)?.kyc_status || null,
    }));
  }

  async getLease(landlordUserId: string, leaseId: string) {
    const client = this.supabase.getClient();
    const landlordProfile = await this.ensureLandlordProfile(landlordUserId);
    const landlordId = landlordProfile.id;

    const { data: lease, error: leaseError } = await client
      .from('leases')
      .select('*')
      .eq('id', leaseId)
      .eq('landlord_id', landlordId)
      .single();

    if (leaseError || !lease) {
      throw new NotFoundException('Lease not found');
    }

    const [unitRes, tenantRes] = await Promise.all([
      client.from('units').select('id, unit_identifier, monthly_rent, property_id').eq('id', lease.unit_id).single(),
      client.from('profiles').select('id, full_name, kyc_status').eq('id', lease.tenant_id).single(),
    ]);

    if (unitRes.error || tenantRes.error) {
      throw unitRes.error || tenantRes.error;
    }

    return {
      ...lease,
      unit: unitRes.data || null,
      tenant: tenantRes.data || null,
    };
  }

  async createLease(
    landlordUserId: string,
    payload: {
      tenant_id?: string;
      tenant_email?: string;
      unit_id: string;
      monthly_rent: number;
      payment_method?: 'PLATFORM' | 'DIRECT';
      start_date?: string;
      end_date?: string;
      status?: string;
    },
  ) {
    const client = this.supabase.getClient();
    const landlordProfile = await this.ensureLandlordProfile(landlordUserId);
    const landlordId = landlordProfile.id;

    const { data: unit, error: unitError } = await client.from('units').select('id, property_id, is_occupied').eq('id', payload.unit_id).single();
    if (unitError || !unit) {
      throw new NotFoundException('Unit not found');
    }
    if (unit.is_occupied) {
      throw new BadRequestException('Unit is already occupied');
    }

    const { data: leaseUnit } = await client.from('properties').select('landlord_id').eq('id', unit.property_id).single();
    if (!leaseUnit || leaseUnit.landlord_id !== landlordId) {
      throw new BadRequestException('Unit does not belong to this landlord');
    }

    let tenantId = payload.tenant_id;
    if (!tenantId && payload.tenant_email) {
      const { data: userByEmail, error: userError } = await client.from('auth.users').select('id,email').eq('email', payload.tenant_email).single();
      if (userError || !userByEmail?.id) {
        throw new NotFoundException('Tenant not found by email');
      }
      tenantId = userByEmail.id;
    }

    if (!tenantId) {
      throw new BadRequestException('Tenant must be specified');
    }

    const { data: profile, error: profileError } = await client.from('profiles').select('id, role').eq('id', tenantId).single();
    if (profileError || !profile) {
      throw new NotFoundException('Tenant profile not found');
    }
    if (profile.role && profile.role !== 'TENANT' && profile.role !== 'BOTH') {
      throw new BadRequestException('Selected user is not a tenant');
    }

    const { data: createdLease, error: createError } = await client
      .from('leases')
      .insert([
        {
          unit_id: payload.unit_id,
          tenant_id: tenantId,
          landlord_id: landlordId,
          monthly_rent: payload.monthly_rent,
          payment_method: payload.payment_method || 'PLATFORM',
          start_date: payload.start_date || new Date().toISOString().slice(0, 10),
          end_date: payload.end_date || null,
          status: payload.status || 'ACTIVE',
        },
      ])
      .select('*')
      .single();

    if (createError || !createdLease) {
      throw createError || new Error('Unable to create lease');
    }

    await client.from('units').update({ is_occupied: true }).eq('id', payload.unit_id);

    return createdLease;
  }

  async updateLease(
    landlordUserId: string,
    leaseId: string,
    payload: {
      monthly_rent?: number;
      start_date?: string;
      end_date?: string;
      status?: string;
    },
  ) {
    const client = this.supabase.getClient();
    const landlordProfile = await this.ensureLandlordProfile(landlordUserId);
    const landlordId = landlordProfile.id;

    const { data: lease, error: leaseError } = await client
      .from('leases')
      .select('*')
      .eq('id', leaseId)
      .eq('landlord_id', landlordId)
      .single();

    if (leaseError || !lease) {
      throw new NotFoundException('Lease not found');
    }

    const updates: any = {};
    if (payload.monthly_rent != null) {
      updates.monthly_rent = payload.monthly_rent;
    }
    if (payload.start_date) {
      updates.start_date = payload.start_date;
    }
    if (payload.end_date) {
      updates.end_date = payload.end_date;
    }
    if (payload.status) {
      updates.status = payload.status;
    }

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No valid lease fields provided for update');
    }

    if (payload.status && payload.status !== 'ACTIVE' && lease.status === 'ACTIVE') {
      await client.from('units').update({ is_occupied: false }).eq('id', lease.unit_id);
    }
    if (payload.status === 'ACTIVE' && lease.status !== 'ACTIVE') {
      await client.from('units').update({ is_occupied: true }).eq('id', lease.unit_id);
    }

    const { data: updatedLease, error: updateError } = await client
      .from('leases')
      .update(updates)
      .eq('id', leaseId)
      .select('*')
      .single();

    if (updateError || !updatedLease) {
      throw updateError || new Error('Unable to update lease');
    }

    return updatedLease;
  }

  async deleteLease(landlordUserId: string, leaseId: string) {
    const client = this.supabase.getClient();
    const landlordProfile = await this.ensureLandlordProfile(landlordUserId);
    const landlordId = landlordProfile.id;

    const { data: lease, error: leaseError } = await client
      .from('leases')
      .select('*')
      .eq('id', leaseId)
      .eq('landlord_id', landlordId)
      .single();

    if (leaseError || !lease) {
      throw new NotFoundException('Lease not found');
    }

    const [paymentsRes, depositsRes] = await Promise.all([
      client.from('payments').select('id').eq('lease_id', leaseId).limit(1),
      client.from('deposits').select('id').eq('lease_id', leaseId).limit(1),
    ]);

    if (paymentsRes.error || depositsRes.error) {
      throw paymentsRes.error || depositsRes.error;
    }
    if ((paymentsRes.data?.length || 0) > 0 || (depositsRes.data?.length || 0) > 0) {
      throw new BadRequestException('Cannot delete a lease with existing payments or deposits');
    }

    await client.from('units').update({ is_occupied: false }).eq('id', lease.unit_id);
    const { error: deleteError } = await client.from('leases').delete().eq('id', leaseId);
    if (deleteError) {
      throw deleteError;
    }

    return true;
  }

  async requestLeasePaymentMethodSwitch(landlordUserId: string, leaseId: string, requestedMethod: 'PLATFORM' | 'DIRECT') {
    const client = this.supabase.getClient();
    const landlordProfile = await this.ensureLandlordProfile(landlordUserId);
    const { data: lease, error: leaseErr } = await client
      .from('leases')
      .select('*')
      .eq('id', leaseId)
      .eq('landlord_id', landlordProfile.id)
      .single();
    if (leaseErr || !lease) throw new NotFoundException('Lease not found');
    const { data: existing } = await client
      .from('lease_payment_method_switch_requests')
      .select('*')
      .eq('lease_id', leaseId)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .maybeSingle();
    if (existing) return existing;
    const { data: created, error } = await client
      .from('lease_payment_method_switch_requests')
      .insert([
        {
          lease_id: leaseId,
          requested_by: landlordUserId,
          requested_method: requestedMethod,
          landlord_confirmed: true,
          tenant_confirmed: false,
        },
      ])
      .select('*')
      .single();
    if (error) throw error;
    if (lease.tenant_id) {
      await this.notificationsService.createNotification({
        user_id: lease.tenant_id,
        type: 'LEASE_UPDATED',
        title: 'Payment method switch request',
        message: `Your landlord requested a switch to ${requestedMethod.toLowerCase()} payments.`,
        metadata: { lease_id: leaseId, requested_method: requestedMethod },
      });
    }
    return created;
  }

  async confirmLeasePaymentMethodSwitch(landlordUserId: string, requestId: string) {
    const client = this.supabase.getClient();
    const landlordProfile = await this.ensureLandlordProfile(landlordUserId);
    const { data: req, error } = await client
      .from('lease_payment_method_switch_requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'PENDING')
      .single();
    if (error || !req) throw new NotFoundException('Switch request not found');
    const { data: lease } = await client
      .from('leases')
      .select('*')
      .eq('id', req.lease_id)
      .eq('landlord_id', landlordProfile.id)
      .single();
    if (!lease) throw new NotFoundException('Lease not found');
    const nextLandlordConfirmed = true;
    const nextTenantConfirmed = Boolean(req.tenant_confirmed);
    const approved = nextLandlordConfirmed && nextTenantConfirmed;
    const { data: updated, error: updateErr } = await client
      .from('lease_payment_method_switch_requests')
      .update({
        landlord_confirmed: nextLandlordConfirmed,
        status: approved ? 'APPROVED' : 'PENDING',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select('*')
      .single();
    if (updateErr) throw updateErr;
    if (approved) {
      await client.from('leases').update({ payment_method: req.requested_method }).eq('id', req.lease_id);
    }
    return updated;
  }

  async listLeasePaymentMethodSwitchRequests(landlordUserId: string) {
    const client = this.supabase.getClient();
    const landlordProfile = await this.ensureLandlordProfile(landlordUserId);
    const { data: leases } = await client.from('leases').select('id').eq('landlord_id', landlordProfile.id).eq('status', 'ACTIVE');
    const leaseIds = (leases || []).map((row: any) => row.id);
    if (!leaseIds.length) return [];
    const { data, error } = await client
      .from('lease_payment_method_switch_requests')
      .select('*')
      .in('lease_id', leaseIds)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async submitOnboarding(
    landlordUserId: string,
    payload: {
      full_legal_name: string;
      business_name?: string;
      registration_number: string;
      phone_number: string;
      id_document_path: string;
      ownership_document_path: string;
      properties_intended: number;
      tenants_estimated: number;
      consent_text_version: string;
      consent_ip?: string;
      consent_user_agent?: string;
    },
  ) {
    const client = this.supabase.getClient();
    await client
      .from('partner_consents')
      .insert([
        {
          landlord_id: landlordUserId,
          consent_text_version: payload.consent_text_version,
          ip_address: payload.consent_ip || null,
          user_agent: payload.consent_user_agent || null,
        },
      ]);
    const { data, error } = await client
      .from('landlord_onboarding_submissions')
      .insert([
        {
          landlord_id: landlordUserId,
          full_legal_name: payload.full_legal_name,
          business_name: payload.business_name || null,
          registration_number: payload.registration_number,
          phone_number: payload.phone_number,
          id_document_path: payload.id_document_path,
          ownership_document_path: payload.ownership_document_path,
          properties_intended: payload.properties_intended || 1,
          tenants_estimated: payload.tenants_estimated || 1,
          status: 'PENDING_APPROVAL',
        },
      ])
      .select('*')
      .single();
    if (error) throw error;
    await client.from('profiles').update({ partner_approval_status: 'PENDING_APPROVAL' }).eq('id', landlordUserId);
    return data;
  }

  async getOnboardingStatus(landlordUserId: string) {
    const client = this.supabase.getClient();
    const { data } = await client
      .from('landlord_onboarding_submissions')
      .select('*')
      .eq('landlord_id', landlordUserId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data || null;
  }
}
