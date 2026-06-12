import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreditScoreService } from '../credit-score/credit-score.service';
import { brandTierFromScore100 } from '../credit-score/tier-branding';
import { NotificationsService } from '../notifications/notifications.service';
import { buildPaymentMetrics } from '../payments/payment-metrics.util';

@Injectable()
export class TenantsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly creditScoreService: CreditScoreService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getTenantProfile(userId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client.from('profiles').select('*').eq('id', userId).single();
    if (error || !data) {
      throw new NotFoundException('Tenant profile not found');
    }
    return data;
  }

  async getActiveLease(userId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('leases')
      .select(
        `
        *,
        units (
          id,
          unit_identifier,
          monthly_rent,
          property_id,
          properties (
            property_name,
            address_street,
            address_suburb,
            address_city,
            address_postcode
          )
        )
      `,
      )
      .eq('tenant_id', userId)
      .eq('status', 'ACTIVE')
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    let landlordProfile: { business_name?: string; user_id?: string } | null = null;
    if (data.landlord_id) {
      const { data: landlord } = await client
        .from('landlord_profiles')
        .select('business_name, user_id')
        .eq('id', data.landlord_id)
        .maybeSingle();
      landlordProfile = landlord;
    }

    return { ...data, landlord_profiles: landlordProfile };
  }

  private formatLeaseSummary(activeLease: any, deposit: any) {
    if (!activeLease) return null;
    const unit = activeLease.units;
    const property = unit?.properties;
    const addressParts = [
      property?.address_street,
      property?.address_suburb,
      property?.address_city,
      property?.address_postcode,
    ].filter(Boolean);

    return {
      lease_id: activeLease.id,
      status: activeLease.status,
      monthly_rent: activeLease.monthly_rent,
      start_date: activeLease.start_date,
      end_date: activeLease.end_date,
      payment_method: activeLease.payment_method,
      unit_identifier: unit?.unit_identifier,
      property_name: property?.property_name,
      address: addressParts.join(', '),
      landlord_name: activeLease.landlord_profiles?.business_name || 'Your landlord',
      deposit_amount: deposit?.amount ?? null,
      deposit_status: deposit?.status ?? null,
    };
  }

  async getCurrentScore(userId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('credit_scores')
      .select('*')
      .eq('tenant_id', userId)
      .eq('is_current', true)
      .order('calculation_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return null;
    }
    return data;
  }

  async getLatestReport(userId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('credit_reports')
      .select('*')
      .eq('tenant_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return null;
    }
    return data;
  }

  async getPaymentMetrics(userId: string, monthsBack = 12) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('payments')
      .select('status, due_date, paid_date, days_overdue')
      .eq('tenant_id', userId)
      .order('due_date', { ascending: false });
    if (error) throw error;
    return buildPaymentMetrics(data || [], monthsBack);
  }

  async getRecentPayments(userId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('payments')
      .select('*')
      .eq('tenant_id', userId)
      .order('due_date', { ascending: false })
      .limit(5);

    if (error) {
      throw error;
    }
    return data || [];
  }

  async getPaymentHistory(userId: string, monthsBack = 12) {
    const client = this.supabase.getClient();
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - monthsBack);
    const dateString = twelveMonthsAgo.toISOString().slice(0, 10);

    const { data, error } = await client
      .from('payments')
      .select('*')
      .eq('tenant_id', userId)
      .gte('paid_date', dateString)
      .order('paid_date', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }
    return data || [];
  }

  async getUpcomingPayments(userId: string) {
    const client = this.supabase.getClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await client
      .from('payments')
      .select('*')
      .eq('tenant_id', userId)
      .neq('status', 'PAID')
      .gte('due_date', today)
      .order('due_date', { ascending: true })
      .limit(3);

    if (error) {
      throw error;
    }
    return data || [];
  }

  async getDepositStatus(userId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('deposits')
      .select('*')
      .eq('tenant_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return null;
    }
    return data;
  }

  async buildDashboard(userId: string) {
    const [profile, activeLease, currentScore, latestReport, recentPayments, upcomingPayments, deposit, paymentMethods, kycDocs, paymentMetrics] =
      await Promise.all([
      this.getTenantProfile(userId),
      this.getActiveLease(userId),
      this.getCurrentScore(userId),
      this.getLatestReport(userId),
      this.getRecentPayments(userId),
      this.getUpcomingPayments(userId),
      this.getDepositStatus(userId),
      this.supabase.getClient().from('payment_methods').select('id').eq('user_id', userId),
      this.supabase.getClient().from('kyc_documents').select('doc_type').eq('user_id', userId),
      this.getPaymentMetrics(userId),
    ]);

    const score = currentScore || (await this.creditScoreService.calculateScore(userId));
    const score100 =
      score?.score_100 ??
      (score?.score != null ? Math.round(((Number(score.score) - 300) / 600) * 1000) / 10 : 0);
    const brandTier = brandTierFromScore100(score100);
    const formattedScore = score
      ? {
          score: score.score,
          score_100: score100,
          tier: score.tier,
          brand_tier: brandTier,
          updatedAt: score.calculation_date ?? score.generated_at ?? new Date().toISOString(),
        }
      : null;

    const kycDocTypes = new Set((kycDocs.data || []).map((doc: any) => doc.doc_type));
    const hasKycDocs =
      kycDocTypes.has('NATIONAL_ID_FRONT') && kycDocTypes.has('SELFIE') && kycDocTypes.has('PROOF_OF_INCOME');
    const hasPaymentMethod = (paymentMethods.data || []).length > 0;
    const hasFirstPaidPayment = (recentPayments || []).some((payment: any) => payment.status === 'PAID');
    const scoreActive = Boolean(score && hasFirstPaidPayment);
    const checklist = [
      { key: 'account_created', label: 'Account created', completed: true, blocked: false, action: null },
      { key: 'kyc_submitted', label: 'Submit KYC documents', completed: hasKycDocs, blocked: false, action: '/tenant/kyc' },
      {
        key: 'payment_method_linked',
        label: 'Link a payment method',
        completed: hasPaymentMethod,
        blocked: !hasKycDocs,
        action: '/tenant/settings',
      },
      {
        key: 'first_payment_paid',
        label: "Pay your first month's rent",
        completed: hasFirstPaidPayment,
        blocked: !hasKycDocs || !hasPaymentMethod,
        action: '/tenant/payments',
      },
      {
        key: 'score_active',
        label: 'Your CRENIT Score is now active',
        completed: scoreActive,
        blocked: !hasFirstPaidPayment,
        action: null,
      },
    ];
    const onboardingComplete = checklist.every((step) => step.completed);

    return {
      profile,
      activeLease,
      leaseSummary: this.formatLeaseSummary(activeLease, deposit),
      score: formattedScore,
      latestReport,
      recentPayments,
      upcomingPayments,
      deposit,
      onboarding: {
        completed: onboardingComplete,
        steps: checklist,
      },
      paymentMetrics,
    };
  }

  async listRenewals(userId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('lease_renewals')
      .select('*')
      .eq('tenant_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async respondToRenewal(
    userId: string,
    body: { renewal_id: string; action: 'APPROVE' | 'REJECT' | 'COUNTER'; proposed_rent?: number; proposed_end_date?: string },
  ) {
    const client = this.supabase.getClient();
    const { data: renewal, error: renewalErr } = await client
      .from('lease_renewals')
      .select('*')
      .eq('id', body.renewal_id)
      .eq('tenant_id', userId)
      .single();
    if (renewalErr || !renewal) throw new NotFoundException('Renewal proposal not found');

    let status = renewal.status;
    const updates: Record<string, unknown> = {};
    if (body.action === 'APPROVE') {
      status = 'APPROVED';
    } else if (body.action === 'REJECT') {
      status = 'REJECTED';
    } else {
      status = 'PENDING_APPROVAL';
      if (body.proposed_rent != null) updates.proposed_rent = body.proposed_rent;
      if (body.proposed_end_date) updates.proposed_end_date = body.proposed_end_date;
    }
    updates.status = status;

    const { data: updated, error } = await client
      .from('lease_renewals')
      .update(updates)
      .eq('id', body.renewal_id)
      .select('*')
      .single();
    if (error) throw error;

    if (status === 'APPROVED' && renewal.lease_id) {
      await client
        .from('leases')
        .update({
          end_date: updated.proposed_end_date ?? renewal.current_end_date ?? null,
          monthly_rent: updated.proposed_rent ?? renewal.proposed_rent ?? null,
        })
        .eq('id', renewal.lease_id);
    }

    if (renewal.landlord_id) {
      const { data: landlord } = await client.from('landlord_profiles').select('user_id').eq('id', renewal.landlord_id).maybeSingle();
      if (landlord?.user_id) {
        await this.notificationsService.createNotification({
          user_id: landlord.user_id,
          type: 'LEASE_RENEWAL_UPDATED',
          title: 'Tenant responded to renewal',
          message: `Tenant has ${body.action.toLowerCase()}d the lease renewal proposal.`,
          metadata: { renewal_id: body.renewal_id, action: body.action, status },
        });
      }
    }

    return updated;
  }

  async requestPaymentMethodSwitch(userId: string, requestedMethod: 'PLATFORM' | 'DIRECT') {
    const client = this.supabase.getClient();
    const activeLease = await this.getActiveLease(userId);
    if (!activeLease) throw new NotFoundException('Active lease not found');
    const { data: existing } = await client
      .from('lease_payment_method_switch_requests')
      .select('*')
      .eq('lease_id', activeLease.id)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .maybeSingle();
    if (existing) return existing;
    const { data: created, error } = await client
      .from('lease_payment_method_switch_requests')
      .insert([
        {
          lease_id: activeLease.id,
          requested_by: userId,
          requested_method: requestedMethod,
          tenant_confirmed: true,
          landlord_confirmed: false,
        },
      ])
      .select('*')
      .single();
    if (error) throw error;
    if (activeLease.landlord_id) {
      const { data: landlord } = await client.from('landlord_profiles').select('user_id').eq('id', activeLease.landlord_id).maybeSingle();
      if (landlord?.user_id) {
        await this.notificationsService.createNotification({
          user_id: landlord.user_id,
          type: 'LEASE_UPDATED',
          title: 'Payment method switch request',
          message: `A tenant requested a switch to ${requestedMethod.toLowerCase()} payments.`,
          metadata: { lease_id: activeLease.id, requested_method: requestedMethod },
        });
      }
    }
    return created;
  }

  async confirmPaymentMethodSwitch(userId: string, requestId: string) {
    const client = this.supabase.getClient();
    const { data: req, error } = await client
      .from('lease_payment_method_switch_requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'PENDING')
      .single();
    if (error || !req) throw new NotFoundException('Switch request not found');

    const { data: lease } = await client.from('leases').select('*').eq('id', req.lease_id).single();
    if (!lease || lease.tenant_id !== userId) throw new NotFoundException('Lease not found');

    const nextTenantConfirmed = true;
    const nextLandlordConfirmed = Boolean(req.landlord_confirmed);
    const approved = nextTenantConfirmed && nextLandlordConfirmed;
    const { data: updated, error: updateErr } = await client
      .from('lease_payment_method_switch_requests')
      .update({
        tenant_confirmed: nextTenantConfirmed,
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

  async listPaymentMethodSwitchRequests(userId: string) {
    const client = this.supabase.getClient();
    const activeLease = await this.getActiveLease(userId);
    if (!activeLease) return [];
    const { data, error } = await client
      .from('lease_payment_method_switch_requests')
      .select('*')
      .eq('lease_id', activeLease.id)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
}
