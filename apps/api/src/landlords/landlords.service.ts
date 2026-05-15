import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class LandlordsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getLandlordProfile(userId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client.from('landlord_profiles').select('*').eq('user_id', userId).limit(1).single();
    if (error || !data) {
      throw new NotFoundException('Landlord profile not found');
    }
    return data;
  }

  async buildOverview(userId: string) {
    const client = this.supabase.getClient();
    const landlordProfile = await this.getLandlordProfile(userId);
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
      },
      properties,
      tenants: tenantSummaries,
      recentPayments: payments,
      depositSummary,
    };
  }

  async listTenants(landlordUserId: string) {
    const client = this.supabase.getClient();
    const landlordProfile = await this.getLandlordProfile(landlordUserId);
    const landlordId = landlordProfile.id;

    const { data: leases, error: leasesError } = await client
      .from('leases')
      .select('id, tenant_id, unit_id, monthly_rent, status, start_date, end_date')
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
    const landlordProfile = await this.getLandlordProfile(landlordUserId);
    const landlordId = landlordProfile.id;

    const { data: leases, error: leasesError } = await client
      .from('leases')
      .select('id, tenant_id, unit_id, monthly_rent, status, start_date, end_date')
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

    return {
      profile,
      leases,
      documents: docsWithUrls,
    };
  }

  async updateTenantKycStatus(landlordUserId: string, tenantId: string, status: string, reason?: string) {
    const client = this.supabase.getClient();
    const landlordProfile = await this.getLandlordProfile(landlordUserId);
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

    return updatedProfile;
  }

  async inviteTenant(landlordUserId: string, payload: { email: string; full_name: string }) {
    const client = this.supabase.getClient();
    const landlordProfile = await this.getLandlordProfile(landlordUserId);

    const temporaryPassword = `RentCredt-${Math.random().toString(36).slice(2, 10)}!`;
    const { data: created, error } = await client.auth.admin.createUser({
      email: payload.email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { role: 'TENANT' },
    });

    if (error) {
      throw error;
    }

    const user = (created as any).user;
    if (!user || !user.id) {
      throw new Error('Failed to create invited tenant user');
    }

    const { error: profileError } = await client.from('profiles').insert([
      {
        id: user.id,
        full_name: payload.full_name,
        role: 'TENANT',
      },
    ]);

    if (profileError) {
      throw profileError;
    }

    return {
      tenant: {
        id: user.id,
        email: user.email,
        full_name: payload.full_name,
      },
      invitedBy: landlordProfile.business_name || landlordProfile.id,
      temporaryPassword,
    };
  }
}
