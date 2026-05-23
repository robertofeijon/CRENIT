import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

interface PendingKycOptions {
  page: number;
  limit: number;
  status: string;
}

interface ListUsersOptions {
  role?: string;
  kycStatus?: string;
  search?: string;
  page: number;
  limit: number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async getPendingKycSubmissions(options: PendingKycOptions) {
    const client = this.supabaseService.getClient();
    const offset = (options.page - 1) * options.limit;

    let query = client.from('profiles').select('id, full_name, role, kyc_status, kyc_rejection_reason, kyc_submitted_at, kyc_approved_at, is_suspended, suspension_reason, created_at', { count: 'exact' });

    if (options.status && options.status !== 'ALL') {
      query = query.eq('kyc_status', options.status);
    }

    const rangeQuery = query.order('kyc_submitted_at', { ascending: false }).range(offset, offset + options.limit - 1);
    const { data, count, error } = await rangeQuery;
    if (error) throw error;

    const userIds = (data || []).map((item: any) => item.id);
    const docsRes = await client
      .from('kyc_documents')
      .select('user_id, doc_type, file_name, storage_path, uploaded_at, status')
      .in('user_id', userIds || [])
      .order('uploaded_at', { ascending: false });
    if (docsRes.error) throw docsRes.error;

    const documentMap = new Map<string, any[]>();
    (docsRes.data || []).forEach((doc: any) => {
      const list = documentMap.get(doc.user_id) ?? [];
      list.push(doc);
      documentMap.set(doc.user_id, list);
    });

    const submissions = await Promise.all(
      (data || []).map(async (profile: any) => {
        let email = 'Unknown';
        try {
          const userRes = await client.from('auth.users').select('email').eq('id', profile.id).maybeSingle();
          if (!userRes.error && userRes.data?.email) {
            email = userRes.data.email;
          }
        } catch {
          email = 'Unknown';
        }
        return {
          user_id: profile.id,
          user_name: profile.full_name,
          user_email: email,
          status: profile.kyc_status,
          rejection_reason: profile.kyc_rejection_reason,
          submitted_at: profile.kyc_submitted_at,
          approved_at: profile.kyc_approved_at,
          documents: (documentMap.get(profile.id) || []).map((doc) => ({
            type: doc.doc_type,
            file_url: client.storage.from('kyc-documents').getPublicUrl(doc.storage_path).data.publicUrl,
            file_name: doc.file_name,
            uploaded_at: doc.uploaded_at,
            status: doc.status,
          })),
        };
      }),
    );

    return {
      submissions,
      total: count ?? submissions.length,
      page: options.page,
      total_pages: options.limit > 0 ? Math.ceil((count ?? submissions.length) / options.limit) : 1,
    };
  }

  async reviewKycSubmission(adminProfile: any, userId: string, action: 'approve' | 'reject', reason: string | null) {
    const client = this.supabaseService.getClient();
    const now = new Date().toISOString();
    const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
    const updatePayload: any = {
      kyc_status: status,
      kyc_approved_at: action === 'approve' ? now : null,
      kyc_rejection_reason: action === 'reject' ? reason : null,
      kyc_reviewed_at: now,
      kyc_reviewer_id: adminProfile.id,
    };

    const { error } = await client.from('profiles').update(updatePayload).eq('id', userId);
    if (error) throw error;

    await client.from('admin_audit_log').insert([
      {
        admin_id: adminProfile.id,
        action: action === 'approve' ? 'KYC_APPROVE' : 'KYC_REJECT',
        target_user_id: userId,
        details: { reason },
        created_at: now,
      },
    ]);

    return {
      user_id: userId,
      status,
      reason,
    };
  }

  async listUsers(options: ListUsersOptions) {
    const client = this.supabaseService.getClient();
    const offset = (options.page - 1) * options.limit;
    let query = client.from('profiles').select('id, full_name, role, kyc_status, is_suspended, suspension_reason, created_at', { count: 'exact' });

    if (options.role) {
      query = query.eq('role', options.role);
    }
    if (options.kycStatus) {
      query = query.eq('kyc_status', options.kycStatus);
    }
    if (options.search) {
      query = query.ilike('full_name', `%${options.search}%`);
    }

    const { data, count, error } = await query.order('created_at', { ascending: false }).range(offset, offset + options.limit - 1);
    if (error) throw error;

    const users = await Promise.all(
      (data || []).map(async (profile: any) => {
        let email = 'Unknown';
        try {
          const userRes = await client.from('auth.users').select('email').eq('id', profile.id).maybeSingle();
          if (!userRes.error && userRes.data?.email) {
            email = userRes.data.email;
          }
        } catch {
          email = 'Unknown';
        }
        return {
          id: profile.id,
          email,
          full_name: profile.full_name,
          role: profile.role,
          kyc_status: profile.kyc_status,
          is_suspended: profile.is_suspended ?? false,
          suspension_reason: profile.suspension_reason ?? null,
          created_at: profile.created_at,
        };
      }),
    );

    return {
      users,
      total: count ?? users.length,
      page: options.page,
      total_pages: options.limit > 0 ? Math.ceil((count ?? users.length) / options.limit) : 1,
    };
  }

  async updateUserSuspension(adminProfile: any, userId: string, suspended: boolean, reason: string | null) {
    const client = this.supabaseService.getClient();
    const now = new Date().toISOString();
    const { error } = await client
      .from('profiles')
      .update({ is_suspended: suspended, suspension_reason: reason, updated_at: now })
      .eq('id', userId);
    if (error) throw error;

    await client.from('admin_audit_log').insert([
      {
        admin_id: adminProfile.id,
        action: suspended ? 'USER_SUSPEND' : 'USER_ACTIVATE',
        target_user_id: userId,
        details: { reason },
        created_at: now,
      },
    ]);

    return { user_id: userId, suspended, reason };
  }

  async getPartnerApplications(options: { page: number; limit: number; status?: string }) {
    const client = this.supabaseService.getClient();
    const offset = (options.page - 1) * options.limit;

    let query = client.from('landlord_profiles').select('id, user_id, business_name, partner_status, partner_approved_at, created_at', { count: 'exact' });
    if (options.status && options.status !== 'ALL') {
      query = query.eq('partner_status', options.status);
    }

    const { data, count, error } = await query.order('created_at', { ascending: false }).range(offset, offset + options.limit - 1);
    if (error) throw error;

    const userIds = (data || []).map((profile: any) => profile.user_id).filter(Boolean);
    const profilesRes = userIds.length
      ? await client.from('profiles').select('id, full_name').in('id', userIds)
      : { data: [], error: null };

    if (profilesRes.error) throw profilesRes.error;
    const profileMap = new Map((profilesRes.data || []).map((profile: any) => [profile.id, profile]));

    const applications = (data || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      full_name: profileMap.get(row.user_id)?.full_name || 'Unknown',
      business_name: row.business_name,
      partner_status: row.partner_status,
      partner_approved_at: row.partner_approved_at,
      created_at: row.created_at,
    }));

    return {
      applications,
      total: count ?? applications.length,
      page: options.page,
      total_pages: options.limit > 0 ? Math.ceil((count ?? applications.length) / options.limit) : 1,
    };
  }

  async updatePartnerStatus(adminProfile: any, landlordId: string, status: 'PENDING' | 'APPROVED' | 'SUSPENDED') {
    const client = this.supabaseService.getClient();
    const now = new Date().toISOString();
    const { error } = await client
      .from('landlord_profiles')
      .update({ partner_status: status, partner_approved_at: status === 'APPROVED' ? now : null, updated_at: now })
      .eq('id', landlordId);
    if (error) throw error;

    await client.from('admin_audit_log').insert([
      {
        admin_id: adminProfile.id,
        action: status === 'APPROVED' ? 'PARTNER_APPROVE' : status === 'SUSPENDED' ? 'PARTNER_SUSPEND' : 'PARTNER_SET_PENDING',
        target_user_id: landlordId,
        details: { partner_status: status },
        created_at: now,
      },
    ]);

    return { landlord_id: landlordId, partner_status: status };
  }

  async getOverview() {
    const client = this.supabaseService.getClient();
    const [usersRes, paymentsRes, disputesRes, kycPendingRes] = await Promise.all([
      client.from('profiles').select('id', { count: 'exact', head: true }),
      client.from('payments').select('id, amount_gross, status, commission_amount', { count: 'exact' }).limit(500),
      client.from('disputes').select('id, status', { count: 'exact' }).in('status', ['OPEN', 'UNDER_REVIEW']),
      client.from('profiles').select('id', { count: 'exact', head: true }).eq('kyc_status', 'PENDING'),
    ]);

    const payments = paymentsRes.data || [];
    const totalVolume = payments.reduce((sum: number, p: any) => sum + Number(p.amount_gross || 0), 0);
    const totalCommission = payments.reduce((sum: number, p: any) => sum + Number(p.commission_amount || 0), 0);
    const paidCount = payments.filter((p: any) => p.status === 'PAID').length;

    return {
      total_users: usersRes.count ?? 0,
      pending_kyc: kycPendingRes.count ?? 0,
      open_disputes: disputesRes.count ?? 0,
      payment_count: paymentsRes.count ?? payments.length,
      paid_payment_count: paidCount,
      total_payment_volume: totalVolume,
      total_commission: totalCommission,
    };
  }

  async getAuditLog(page = 1, limit = 30) {
    const client = this.supabaseService.getClient();
    const offset = (page - 1) * limit;
    const { data, count, error } = await client
      .from('admin_audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    const logs = await Promise.all(
      (data || []).map(async (log: any) => {
        let adminName = log.admin_id;
        let targetName = log.target_user_id;
        try {
          const [adminRes, targetRes] = await Promise.all([
            client.from('profiles').select('full_name').eq('id', log.admin_id).maybeSingle(),
            log.target_user_id ? client.from('profiles').select('full_name').eq('id', log.target_user_id).maybeSingle() : Promise.resolve({ data: null }),
          ]);
          adminName = adminRes.data?.full_name || adminName;
          targetName = targetRes.data?.full_name || targetName;
        } catch {
          // keep ids
        }
        return { ...log, admin_name: adminName, target_name: targetName };
      }),
    );

    return { logs, total: count ?? logs.length, page, total_pages: limit > 0 ? Math.ceil((count ?? logs.length) / limit) : 1 };
  }

  async getPaymentOversight(page = 1, limit = 30) {
    const client = this.supabaseService.getClient();
    const offset = (page - 1) * limit;
    const { data, count, error } = await client
      .from('payments')
      .select('id, tenant_id, landlord_id, amount_gross, commission_amount, amount_net, status, payment_method, paid_date, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    const summary = (data || []).reduce(
      (acc: any, payment: any) => {
        acc.total_gross += Number(payment.amount_gross || 0);
        acc.total_commission += Number(payment.commission_amount || 0);
        if (payment.status === 'PAID') acc.paid += 1;
        if (payment.status === 'PENDING') acc.pending += 1;
        return acc;
      },
      { total_gross: 0, total_commission: 0, paid: 0, pending: 0 },
    );

    return { payments: data || [], summary, total: count ?? 0, page };
  }
}
