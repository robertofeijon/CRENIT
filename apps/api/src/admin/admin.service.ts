import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';

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

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

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
    const flagsRes = userIds.length
      ? await client.from('kyc_flags').select('id, user_id, flag_type, flag_note, flagged_at, dismissed_at').in('user_id', userIds).is('dismissed_at', null)
      : { data: [], error: null };
    if (flagsRes.error) throw flagsRes.error;

    const documentMap = new Map<string, any[]>();
    (docsRes.data || []).forEach((doc: any) => {
      const list = documentMap.get(doc.user_id) ?? [];
      list.push(doc);
      documentMap.set(doc.user_id, list);
    });
    const flagMap = new Map<string, any[]>();
    (flagsRes.data || []).forEach((flag: any) => {
      const list = flagMap.get(flag.user_id) ?? [];
      list.push(flag);
      flagMap.set(flag.user_id, list);
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
          quality_flags: flagMap.get(profile.id) || [],
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
    const { data: before } = await client.from('profiles').select('kyc_status').eq('id', userId).maybeSingle();
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

    await client.from('kyc_audit_log').insert([
      {
        user_id: userId,
        actor_id: adminProfile.id,
        action: action === 'approve' ? 'KYC_APPROVED' : 'KYC_REJECTED',
        previous_status: before?.kyc_status ?? null,
        next_status: status,
        reason,
        metadata: { reviewer_role: 'ADMIN' },
        created_at: now,
      },
    ]);

    await this.notificationsService.createNotification({
      user_id: userId,
      type: status === 'APPROVED' ? 'KYC_APPROVED' : 'KYC_REJECTED',
      title: status === 'APPROVED' ? 'KYC approved' : 'KYC requires action',
      message:
        status === 'APPROVED'
          ? 'Your identity has been verified — your RentCredit Score is now active.'
          : `Action required: your KYC submission needs attention.${reason ? ` Reason: ${reason}` : ''}`,
      metadata: { status, reason: reason ?? null },
    });

    return {
      user_id: userId,
      status,
      reason,
    };
  }

  async getKycAuditLog(userId: string, limit = 30) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('kyc_audit_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    const actorIds = Array.from(new Set((data || []).map((row: any) => row.actor_id).filter(Boolean)));
    const actorsRes = actorIds.length
      ? await client.from('profiles').select('id, full_name, role').in('id', actorIds)
      : { data: [], error: null };
    if (actorsRes.error) throw actorsRes.error;
    const actorById = new Map((actorsRes.data || []).map((actor: any) => [actor.id, actor]));

    return (data || []).map((row: any) => ({
      ...row,
      actor_name: actorById.get(row.actor_id)?.full_name || null,
      actor_role: actorById.get(row.actor_id)?.role || null,
    }));
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

  async getPaymentOversight(page = 1, limit = 30, paymentMethod?: string) {
    const client = this.supabaseService.getClient();
    const offset = (page - 1) * limit;
    let query = client
      .from('payments')
      .select('id, tenant_id, landlord_id, amount_gross, commission_amount, amount_net, status, payment_method, paid_date, created_at', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (paymentMethod) {
      query = query.eq('payment_method', paymentMethod);
    }
    const { data, count, error } = await query.range(offset, offset + limit - 1);
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

  async getKycComplianceOverview(page = 1, limit = 20) {
    const client = this.supabaseService.getClient();
    const offset = (page - 1) * limit;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [profilesRes, totalRes, approvedRes, rejectedRes, flagsRes] = await Promise.all([
      client
        .from('profiles')
        .select('id, full_name, kyc_status, kyc_submitted_at, kyc_reviewed_at, kyc_reviewer_id')
        .not('kyc_submitted_at', 'is', null)
        .order('kyc_submitted_at', { ascending: false })
        .range(offset, offset + limit - 1),
      client.from('profiles').select('id', { count: 'exact', head: true }).not('kyc_submitted_at', 'is', null),
      client
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('kyc_status', 'APPROVED')
        .gte('kyc_reviewed_at', startOfMonth.toISOString()),
      client
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('kyc_status', 'REJECTED')
        .gte('kyc_reviewed_at', startOfMonth.toISOString()),
      client.from('kyc_flags').select('id', { count: 'exact', head: true }).is('dismissed_at', null),
    ]);

    if (profilesRes.error || totalRes.error || approvedRes.error || rejectedRes.error || flagsRes.error) {
      throw profilesRes.error || totalRes.error || approvedRes.error || rejectedRes.error || flagsRes.error;
    }

    const rows = profilesRes.data || [];
    const reviewerIds = Array.from(new Set(rows.map((row: any) => row.kyc_reviewer_id).filter(Boolean)));
    const reviewersRes = reviewerIds.length
      ? await client.from('profiles').select('id, full_name').in('id', reviewerIds)
      : { data: [], error: null };
    if (reviewersRes.error) throw reviewersRes.error;
    const reviewerById = new Map((reviewersRes.data || []).map((r: any) => [r.id, r.full_name]));

    const userIds = rows.map((r: any) => r.id);
    const flagsDataRes = userIds.length
      ? await client
          .from('kyc_flags')
          .select('id, user_id, flag_type, flag_note, flagged_at, dismissed_at')
          .in('user_id', userIds)
          .is('dismissed_at', null)
      : { data: [], error: null };
    if (flagsDataRes.error) throw flagsDataRes.error;
    const flagsByUser = new Map<string, any[]>();
    (flagsDataRes.data || []).forEach((flag: any) => {
      const list = flagsByUser.get(flag.user_id) ?? [];
      list.push(flag);
      flagsByUser.set(flag.user_id, list);
    });

    const averageReviewHours = (() => {
      const diffs = rows
        .filter((r: any) => r.kyc_submitted_at && r.kyc_reviewed_at)
        .map(
          (r: any) =>
            (new Date(r.kyc_reviewed_at).getTime() - new Date(r.kyc_submitted_at).getTime()) / (1000 * 60 * 60),
        )
        .filter((n: number) => Number.isFinite(n) && n >= 0);
      if (!diffs.length) return 0;
      return Math.round((diffs.reduce((a, b) => a + b, 0) / diffs.length) * 10) / 10;
    })();

    return {
      stats: {
        total_submissions: totalRes.count ?? 0,
        approved_this_month: approvedRes.count ?? 0,
        rejected_this_month: rejectedRes.count ?? 0,
        average_review_time_hours: averageReviewHours,
        open_quality_flags: flagsRes.count ?? 0,
      },
      rows: rows.map((row: any) => ({
        tenant_id: row.id,
        tenant_name: row.full_name,
        submission_date: row.kyc_submitted_at,
        reviewed_by: reviewerById.get(row.kyc_reviewer_id) || null,
        decision: row.kyc_status,
        time_to_decision_hours:
          row.kyc_submitted_at && row.kyc_reviewed_at
            ? Math.round(
                ((new Date(row.kyc_reviewed_at).getTime() - new Date(row.kyc_submitted_at).getTime()) / (1000 * 60 * 60)) *
                  10,
              ) / 10
            : null,
        flags: flagsByUser.get(row.id) || [],
      })),
      total: totalRes.count ?? rows.length,
      page,
      total_pages: limit > 0 ? Math.ceil((totalRes.count ?? rows.length) / limit) : 1,
    };
  }

  async dismissKycFlag(adminId: string, flagId: string, note: string) {
    const client = this.supabaseService.getClient();
    const now = new Date().toISOString();
    const { data, error } = await client
      .from('kyc_flags')
      .update({ dismissed_by: adminId, dismissed_at: now, dismiss_note: note || null })
      .eq('id', flagId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async getCreditScoreAudit(limit = 100) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('credit_scores')
      .select('id, tenant_id, score, tier, calculation_date, payment_history_score, streak_score, history_length_score, income_rent_ratio_score, deposit_management_score, anomaly_flag, anomaly_note, overridden, override_reason')
      .eq('is_current', true)
      .order('calculation_date', { ascending: false })
      .limit(limit);
    if (error) throw error;
    const tenantIds = Array.from(new Set((data || []).map((row: any) => row.tenant_id).filter(Boolean)));
    const profilesRes = tenantIds.length
      ? await client.from('profiles').select('id, full_name').in('id', tenantIds)
      : { data: [], error: null };
    if (profilesRes.error) throw profilesRes.error;
    const profileById = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
    return (data || []).map((row: any) => ({
      ...row,
      tenant_name: profileById.get(row.tenant_id)?.full_name || 'Unknown',
      inputs_summary: {
        on_time_payments_factor: row.payment_history_score,
        streak_factor: row.streak_score,
        tenancy_length_factor: row.history_length_score,
        income_rent_factor: row.income_rent_ratio_score,
        deposit_factor: row.deposit_management_score,
      },
    }));
  }

  async getCreditScoreHistory(tenantId: string, limit = 12) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('score_history')
      .select('score, tier, recorded_at, event_type, event_reason')
      .eq('tenant_id', tenantId)
      .order('recorded_at', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  async flagCreditScoreAnomaly(adminId: string, tenantId: string, note: string) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('credit_scores')
      .update({ anomaly_flag: true, anomaly_note: note || 'Flagged by admin' })
      .eq('tenant_id', tenantId)
      .eq('is_current', true)
      .select('*')
      .single();
    if (error) throw error;
    await client.from('admin_audit_log').insert([
      {
        admin_id: adminId,
        action: 'CREDIT_SCORE_ANOMALY_FLAG',
        target_user_id: tenantId,
        details: { note },
      },
    ]);
    return data;
  }

  async manualOverrideCreditScore(adminId: string, tenantId: string, score: number, reason: string) {
    const client = this.supabaseService.getClient();
    const tier = score >= 800 ? 'EXCELLENT' : score >= 650 ? 'GOOD' : score >= 500 ? 'FAIR' : 'BUILDING';
    const { data, error } = await client
      .from('credit_scores')
      .update({
        score,
        tier,
        overridden: true,
        override_reason: reason,
        anomaly_flag: false,
      })
      .eq('tenant_id', tenantId)
      .eq('is_current', true)
      .select('*')
      .single();
    if (error) throw error;
    await client.from('score_history').insert([
      {
        tenant_id: tenantId,
        score,
        tier,
        recorded_at: new Date().toISOString(),
        event_type: 'OVERRIDE',
        event_reason: reason,
      },
    ]);
    await client.from('admin_audit_log').insert([
      {
        admin_id: adminId,
        action: 'CREDIT_SCORE_OVERRIDE',
        target_user_id: tenantId,
        details: { score, reason },
      },
    ]);
    return data;
  }

  async getSystemHealthSnapshot() {
    const client = this.supabaseService.getClient();
    const now = new Date().toISOString();
    const services = [
      { key: 'payments', name: 'Payment Processing' },
      { key: 'kyc', name: 'KYC Service' },
      { key: 'credit', name: 'Credit Score Engine' },
      { key: 'reports', name: 'Report Generator' },
      { key: 'data', name: 'Data Pipeline' },
      { key: 'notifications', name: 'Email/Notification Service' },
    ];
    const errorRowsRes = await client
      .from('admin_audit_log')
      .select('created_at, action, details')
      .ilike('action', '%ERROR%')
      .order('created_at', { ascending: false })
      .limit(30);
    const errorRows = errorRowsRes.data || [];
    const chart = Array.from({ length: 7 }).map((_, i) => {
      const day = new Date();
      day.setDate(day.getDate() - (6 - i));
      const dayKey = day.toISOString().slice(0, 10);
      const count = errorRows.filter((row: any) => row.created_at?.slice(0, 10) === dayKey).length;
      return {
        day: dayKey,
        payments: count,
        kyc: count,
        credit: count,
        reports: count,
        data: count,
        notifications: count,
      };
    });
    return {
      services: services.map((service) => ({
        ...service,
        status: 'Operational',
        uptime_30d: 99.9,
        last_checked: now,
      })),
      error_rate_7d: chart,
      recent_errors: errorRows.map((row: any) => ({
        timestamp: row.created_at,
        service: 'platform',
        error_type: row.action,
        affected_endpoint: row.details?.endpoint || 'unknown',
        resolution_status: 'OPEN',
      })),
    };
  }

  async exportUserDataForGdpr(adminId: string, userId: string) {
    const client = this.supabaseService.getClient();
    const [profileRes, paymentsRes, kycRes, scoresRes, depositsRes, auditRes] = await Promise.all([
      client.from('profiles').select('*').eq('id', userId).maybeSingle(),
      client.from('payments').select('*').eq('tenant_id', userId),
      client.from('kyc_documents').select('id, doc_type, file_name, uploaded_at, status').eq('user_id', userId),
      client.from('score_history').select('*').eq('tenant_id', userId),
      client.from('deposits').select('*').eq('tenant_id', userId),
      client.from('admin_audit_log').select('*').eq('target_user_id', userId),
    ]);
    await client.from('gdpr_events').insert([
      {
        profile_id: userId,
        event_type: 'EXPORT',
        requested_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        completed_by: adminId,
      },
    ]);
    return {
      profile: profileRes.data,
      payments: paymentsRes.data || [],
      kyc_submissions: kycRes.data || [],
      score_history: scoresRes.data || [],
      deposits: depositsRes.data || [],
      audit_log: auditRes.data || [],
    };
  }

  async anonymiseUserForGdpr(adminId: string, userId: string) {
    const client = this.supabaseService.getClient();
    const token = `anon_${userId.slice(0, 8)}`;
    await client
      .from('profiles')
      .update({
        full_name: token,
        phone: null,
        national_id_number: null,
        employer_name: null,
        address_street: null,
        address_suburb: null,
        address_city: null,
      })
      .eq('id', userId);
    const { data: docs } = await client.from('kyc_documents').select('storage_path').eq('user_id', userId);
    for (const doc of docs || []) {
      if (doc.storage_path) {
        await client.storage.from('kyc-documents').remove([doc.storage_path]).catch(() => null);
      }
    }
    await client.from('gdpr_events').insert([
      {
        profile_id: userId,
        event_type: 'DELETION',
        requested_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        completed_by: adminId,
      },
    ]);
    await client.from('admin_audit_log').insert([
      {
        admin_id: adminId,
        action: 'GDPR_DELETION',
        target_user_id: userId,
        details: { anonymised: true },
      },
    ]);
    return { anonymised: true };
  }

  async getPartnerApprovals(page = 1, limit = 20) {
    const client = this.supabaseService.getClient();
    const offset = (page - 1) * limit;
    const { data, count, error } = await client
      .from('landlord_onboarding_submissions')
      .select('*', { count: 'exact' })
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    const landlordIds = Array.from(new Set((data || []).map((r: any) => r.landlord_id)));
    const profilesRes = landlordIds.length
      ? await client.from('profiles').select('id, full_name, partner_approval_status').in('id', landlordIds)
      : { data: [], error: null };
    if (profilesRes.error) throw profilesRes.error;
    const byId = new Map((profilesRes.data || []).map((row: any) => [row.id, row]));
    return {
      rows: (data || []).map((row: any) => ({
        ...row,
        landlord_name: byId.get(row.landlord_id)?.full_name || 'Unknown',
        current_status: byId.get(row.landlord_id)?.partner_approval_status || 'PENDING_APPROVAL',
      })),
      total: count || 0,
      page,
    };
  }

  async reviewPartnerApproval(adminId: string, submissionId: string, action: 'APPROVE' | 'REJECT', reason?: string) {
    const client = this.supabaseService.getClient();
    const { data: submission, error } = await client
      .from('landlord_onboarding_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();
    if (error || !submission) throw error || new Error('Submission not found');
    const nextStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    await client
      .from('landlord_onboarding_submissions')
      .update({ status: nextStatus, rejection_reason: reason || null, reviewed_by: adminId, reviewed_at: new Date().toISOString() })
      .eq('id', submissionId);
    await client
      .from('profiles')
      .update({ partner_approval_status: nextStatus })
      .eq('id', submission.landlord_id);
    await client
      .from('landlord_profiles')
      .update({ partner_status: nextStatus })
      .eq('user_id', submission.landlord_id);
    await this.notificationsService.createNotification({
      user_id: submission.landlord_id,
      type: action === 'APPROVE' ? 'PARTNER_APPROVED' : 'PARTNER_REJECTED',
      title: action === 'APPROVE' ? 'Landlord account approved' : 'Landlord account requires resubmission',
      message:
        action === 'APPROVE'
          ? 'Your landlord partner profile is approved. All dashboard actions are now unlocked.'
          : `Your landlord partner profile was rejected.${reason ? ` Reason: ${reason}` : ''}`,
      metadata: { submission_id: submissionId, action, reason: reason || null },
    });
    return { id: submissionId, status: nextStatus };
  }
}
