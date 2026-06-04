import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SchedulerHeartbeatService } from '../ops/scheduler-heartbeat.service';
import { buildAuthEmailMap, buildAuthUserMap } from '../supabase/supabase.utils';
import { DOC_TYPE_TO_DB, KycService, REQUIRED_KYC_DOCUMENT_TYPES, type KycDocumentType } from '../kyc/kyc.service';
import { createSignedStorageUrl } from '../supabase/storage.utils';

const KYC_BUCKET = 'kyc-documents';

interface PendingKycOptions {
  page: number;
  limit: number;
  status: string;
  applicant_role?: 'TENANT' | 'LANDLORD';
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
    private readonly kycService: KycService,
    private readonly schedulerHeartbeat: SchedulerHeartbeatService,
  ) {}

  async getPendingKycSubmissions(options: PendingKycOptions) {
    const client = this.supabaseService.getClient();
    const offset = (options.page - 1) * options.limit;

    let query = client
      .from('profiles')
      .select(
        'id, full_name, first_name, surname, phone, date_of_birth, gender, nationality, national_id_number, role, kyc_status, kyc_rejection_reason, kyc_submitted_at, kyc_approved_at, partner_approval_status, address_street, address_region, address_city, address_postcode, address_country, residential_status, is_suspended, suspension_reason, created_at',
        { count: 'exact' },
      );

    if (options.applicant_role === 'TENANT') {
      query = query.eq('role', 'TENANT');
    } else if (options.applicant_role === 'LANDLORD') {
      query = query.eq('role', 'LANDLORD');
    }

    if (options.status && options.status !== 'ALL') {
      if (options.status === 'PENDING') {
        if (options.applicant_role === 'LANDLORD') {
          query = query.in('partner_approval_status', ['PENDING_REVIEW', 'PENDING_APPROVAL']);
        } else {
          query = query.in('kyc_status', ['PENDING', 'PENDING_REVIEW']);
        }
      } else {
        query = query.eq('kyc_status', options.status);
      }
    }

    const rangeQuery = query.order('kyc_submitted_at', { ascending: false }).range(offset, offset + options.limit - 1);
    const { data, count, error } = await rangeQuery;
    if (error) throw error;

    const userIds = (data || []).map((item: any) => item.id);
    let docsData: any[] = [];
    if (userIds.length) {
      const docsRes = await client
        .from('kyc_documents')
        .select('user_id, doc_type, file_name, storage_path, uploaded_at, status')
        .in('user_id', userIds)
        .order('uploaded_at', { ascending: false });
      if (docsRes.error) {
        const missingStatus = docsRes.error.code === '42703' || docsRes.error.message?.includes('status');
        if (missingStatus) {
          const fallbackDocs = await client
            .from('kyc_documents')
            .select('user_id, doc_type, file_name, storage_path, uploaded_at')
            .in('user_id', userIds)
            .order('uploaded_at', { ascending: false });
          if (fallbackDocs.error) throw fallbackDocs.error;
          docsData = (fallbackDocs.data || []).map((doc: any) => ({ ...doc, status: 'PENDING' }));
        } else {
          throw docsRes.error;
        }
      } else {
        docsData = docsRes.data || [];
      }
    }
    let flagsData: any[] = [];
    if (userIds.length) {
      const flagsRes = await client
        .from('kyc_flags')
        .select('id, user_id, flag_type, flag_note, flagged_at, dismissed_at')
        .in('user_id', userIds)
        .is('dismissed_at', null);
      if (flagsRes.error) {
        const missingTable = flagsRes.error.message?.includes('kyc_flags') || flagsRes.error.code === '42P01';
        if (!missingTable) {
          throw flagsRes.error;
        }
        this.logger.warn('kyc_flags table unavailable; continuing without quality flags');
      } else {
        flagsData = flagsRes.data || [];
      }
    }

    const documentMap = new Map<string, any[]>();
    docsData.forEach((doc: any) => {
      const list = documentMap.get(doc.user_id) ?? [];
      list.push(doc);
      documentMap.set(doc.user_id, list);
    });
    const flagMap = new Map<string, any[]>();
    flagsData.forEach((flag: any) => {
      const list = flagMap.get(flag.user_id) ?? [];
      list.push(flag);
      flagMap.set(flag.user_id, list);
    });

    const emailMap = await buildAuthEmailMap(client);

    const landlordIds = (data || []).filter((p: any) => p.role === 'LANDLORD').map((p: any) => p.id);
    let landlordProfileMap = new Map<string, any>();
    if (landlordIds.length) {
      const lpRes = await client
        .from('landlord_profiles')
        .select('user_id, business_name, account_type, vat_number, properties_managed_count, ownership_status')
        .in('user_id', landlordIds);
      if (!lpRes.error) {
        landlordProfileMap = new Map((lpRes.data || []).map((row: any) => [row.user_id, row]));
      }
    }

    const verificationIds = (data || []).map((p: any) => p.id);
    let verificationMap = new Map<string, any>();
    if (verificationIds.length) {
      const vRes = await client.from('kyc_verifications').select('profile_id, metadata').in('profile_id', verificationIds);
      if (!vRes.error) {
        verificationMap = new Map((vRes.data || []).map((row: any) => [row.profile_id, row.metadata]));
      }
    }

    const submissions = await Promise.all(
      (data || []).map(async (profile: any) => {
        const email = emailMap.get(profile.id) ?? 'Unknown';
        const documents = await Promise.all(
          (documentMap.get(profile.id) || []).map(async (doc: any) => ({
            type: doc.doc_type,
            file_url: await createSignedStorageUrl(client, KYC_BUCKET, doc.storage_path),
            file_name: doc.file_name,
            uploaded_at: doc.uploaded_at,
            status: doc.status ?? 'PENDING',
          })),
        );
        const location_comparison =
          profile.role === 'TENANT' ? await this.kycService.getAdminLocationComparison(profile.id) : null;
        const hasLocationMismatch =
          profile.role === 'TENANT' &&
          ((flagMap.get(profile.id) || []).some((f: any) => f.flag_type === 'LOCATION_MISMATCH') ||
            (location_comparison && !location_comparison.match && location_comparison.compared));

        const landlordMeta = (verificationMap.get(profile.id) as Record<string, unknown>) || {};
        const landlordProfile = landlordProfileMap.get(profile.id);

        return {
          user_id: profile.id,
          applicant_role: profile.role,
          user_name: profile.full_name,
          user_email: email,
          status: profile.role === 'LANDLORD' ? profile.partner_approval_status || profile.kyc_status : profile.kyc_status,
          personal: {
            first_name: profile.first_name,
            surname: profile.surname,
            phone: profile.phone,
            date_of_birth: profile.date_of_birth,
            gender: profile.gender,
            nationality: profile.nationality,
            national_id_number: profile.national_id_number,
          },
          rejection_reason: profile.kyc_rejection_reason,
          submitted_at: profile.kyc_submitted_at,
          approved_at: profile.kyc_approved_at,
          quality_flags: flagMap.get(profile.id) || [],
          location_mismatch: hasLocationMismatch,
          location_comparison,
          landlord_details:
            profile.role === 'LANDLORD'
              ? {
                  account_type: landlordMeta.account_type || landlordProfile?.account_type,
                  company_name: landlordMeta.company_name || landlordProfile?.business_name,
                  registration_number: landlordMeta.registration_number,
                  vat_number: landlordProfile?.vat_number,
                  properties_managed_count: landlordProfile?.properties_managed_count,
                  ownership_status: landlordProfile?.ownership_status,
                  property: landlordMeta.property,
                }
              : null,
          documents,
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

  async reviewKycSubmission(
    adminProfile: any,
    userId: string,
    action: 'approve' | 'reject',
    reason: string | null,
    rejectedDocTypes?: string[],
  ) {
    const client = this.supabaseService.getClient();
    const now = new Date().toISOString();

    const { data: before } = await client
      .from('profiles')
      .select('kyc_status, full_name, role, partner_approval_status')
      .eq('id', userId)
      .maybeSingle();
    const isLandlord = before?.role === 'LANDLORD';
    const status = action === 'approve' ? 'VERIFIED' : 'REJECTED';
    const allDocTypes: KycDocumentType[] = [...REQUIRED_KYC_DOCUMENT_TYPES];
    const landlordDocTypes = [
      'government_id',
      'company_registration',
      'proof_of_address',
      'proof_of_property_ownership',
      'selfie',
    ];
    const rejectedTypes =
      action === 'reject'
        ? rejectedDocTypes?.length
          ? rejectedDocTypes
          : isLandlord
            ? landlordDocTypes
            : allDocTypes
        : [];
    const landlordDocToDb: Record<string, string> = {
      government_id: 'NATIONAL_ID_FRONT',
      company_registration: 'EMPLOYER_LETTER',
      proof_of_address: 'PROOF_OF_ADDRESS',
      proof_of_property_ownership: 'BANK_STATEMENT',
      selfie: 'SELFIE',
    };
    const rejectedDbTypes = rejectedTypes
      .map((t) => (isLandlord ? landlordDocToDb[t] : DOC_TYPE_TO_DB[t as KycDocumentType]))
      .filter(Boolean);
    const updatePayload: any = {
      kyc_status: status,
      kyc_approved_at: action === 'approve' ? now : null,
      kyc_rejection_reason: action === 'reject' ? reason : null,
      kyc_reviewed_at: now,
      kyc_reviewer_id: adminProfile.id,
    };

    if (isLandlord) {
      updatePayload.partner_approval_status = action === 'approve' ? 'APPROVED' : 'REJECTED';
      if (action === 'approve') {
        updatePayload.kyc_status = 'VERIFIED';
      }
    }

    const { error } = await client.from('profiles').update(updatePayload).eq('id', userId);
    if (error) throw error;

    if (isLandlord) {
      await client
        .from('landlord_profiles')
        .update({ partner_status: action === 'approve' ? 'APPROVED' : 'REJECTED' })
        .eq('user_id', userId);
    }

    const { data: userDocs } = await client
      .from('kyc_documents')
      .select('id, doc_type, storage_path')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

    if (userDocs?.length) {
      const latestIds = new Map<string, string>();
      for (const doc of userDocs) {
        if (!latestIds.has(doc.doc_type)) latestIds.set(doc.doc_type, doc.id);
      }
      const docStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
      for (const [docType, docId] of latestIds) {
        const shouldUpdate = action === 'approve' || rejectedDbTypes.includes(docType);
        if (!shouldUpdate) continue;
        const { error: docErr } = await client.from('kyc_documents').update({ status: docStatus }).eq('id', docId);
        if (docErr && docErr.code !== '42703' && !docErr.message?.includes('status')) {
          throw docErr;
        }
      }
    }

    const { data: existingVerification } = await client
      .from('kyc_verifications')
      .select('metadata')
      .eq('profile_id', userId)
      .maybeSingle();

    await client.from('kyc_verifications').upsert(
      [
        {
          profile_id: userId,
          status,
          submitted_at: before?.kyc_status === 'NOT_SUBMITTED' ? null : now,
          reviewed_at: now,
          reviewer_id: adminProfile.id,
          rejection_reason: action === 'reject' ? reason : null,
          metadata: {
            ...((existingVerification?.metadata as object) || {}),
            rejected_doc_types: action === 'reject' ? rejectedTypes : [],
            rejected_steps: action === 'reject' ? this.inferRejectedSteps(rejectedTypes, isLandlord) : [],
          },
          updated_at: now,
        },
      ],
      { onConflict: 'profile_id' },
    );

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
      type: status === 'VERIFIED' ? 'KYC_APPROVED' : 'KYC_REJECTED',
      title: status === 'VERIFIED' ? 'KYC approved' : 'KYC requires action',
      message:
        status === 'VERIFIED'
          ? 'Your identity has been verified — your CRENIT Score is now active.'
          : `Action required: your KYC submission needs attention.${reason ? ` Reason: ${reason}` : ''}`,
      metadata: { status, reason: reason ?? null, rejected_doc_types: rejectedTypes },
    });

    if (isLandlord) {
      if (action === 'approve') {
        await this.notificationsService.sendPartnerApprovedEmail(userId, before?.full_name || 'there');
      } else {
        const rejectedSteps = this.inferRejectedSteps(rejectedTypes, true);
        await this.notificationsService.sendPartnerRejectedEmail(
          userId,
          before?.full_name || 'there',
          reason || 'Please review your documents and resubmit.',
          rejectedSteps[0] ?? 3,
        );
      }
    } else if (status === 'VERIFIED') {
      await this.notificationsService.sendKycApprovedEmail(userId, before?.full_name || 'there');
    } else {
      await this.notificationsService.sendKycRejectedEmail(
        userId,
        before?.full_name || 'there',
        reason || 'Please review your documents and resubmit.',
        rejectedTypes,
      );
    }

    return {
      user_id: userId,
      status,
      reason,
      rejected_doc_types: rejectedTypes,
    };
  }

  private inferRejectedSteps(rejectedDocTypes: string[], isLandlord: boolean): number[] {
    if (!isLandlord) return rejectedDocTypes.length ? [3] : [];
    const docStep3 = new Set([
      'government_id',
      'company_registration',
      'proof_of_address',
      'proof_of_property_ownership',
      'selfie',
    ]);
    const steps = new Set<number>();
    if (rejectedDocTypes.some((t) => docStep3.has(t))) steps.add(3);
    return steps.size ? Array.from(steps) : [3];
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
    let query = client
      .from('profiles')
      .select(
        'id, full_name, role, kyc_status, is_suspended, suspension_reason, account_flagged, account_flag_note, created_at',
      );

    if (options.role) {
      query = query.eq('role', options.role);
    }
    if (options.kycStatus) {
      query = query.eq('kyc_status', options.kycStatus);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(500);
    if (error) throw error;

    const authMap = await buildAuthUserMap(client);
    const profileIds = new Set((data || []).map((row: any) => row.id));
    const normalizedSearch = options.search?.trim().toLowerCase() ?? '';

    let users = (data || []).map((profile: any) => {
      const auth = authMap.get(profile.id);
      return {
        id: profile.id,
        email: auth?.email || 'Unknown',
        full_name: profile.full_name || auth?.full_name || 'Unnamed user',
        role: profile.role,
        kyc_status: profile.kyc_status,
        is_suspended: profile.is_suspended ?? false,
        suspension_reason: profile.suspension_reason ?? null,
        account_flagged: profile.account_flagged ?? false,
        account_flag_note: profile.account_flag_note ?? null,
        created_at: profile.created_at,
        has_profile: true,
      };
    });

    authMap.forEach((auth, id) => {
      if (profileIds.has(id)) {
        return;
      }
      const inferredRole = auth.role || 'TENANT';
      if (options.role && inferredRole !== options.role) {
        return;
      }
      users.push({
        id,
        email: auth.email || 'Unknown',
        full_name: auth.full_name || 'Unnamed user',
        role: inferredRole,
        kyc_status: 'NOT_SUBMITTED',
        is_suspended: false,
        suspension_reason: null,
        account_flagged: false,
        account_flag_note: null,
        created_at: null,
        has_profile: false,
      });
    });

    if (normalizedSearch) {
      users = users.filter(
        (person) =>
          person.full_name?.toLowerCase().includes(normalizedSearch) ||
          person.email?.toLowerCase().includes(normalizedSearch) ||
          person.role?.toLowerCase().includes(normalizedSearch),
      );
    }

    users.sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

    const total = users.length;
    const offset = (options.page - 1) * options.limit;
    const pageUsers = users.slice(offset, offset + options.limit);

    return {
      users: pageUsers,
      total,
      page: options.page,
      total_pages: options.limit > 0 ? Math.ceil(total / options.limit) : 1,
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

  async updateUserAccountFlag(adminProfile: any, userId: string, flagged: boolean, note: string | null) {
    const client = this.supabaseService.getClient();
    const now = new Date().toISOString();
    const { error } = await client
      .from('profiles')
      .update({
        account_flagged: flagged,
        account_flag_note: flagged ? note : null,
        account_flagged_at: flagged ? now : null,
        account_flagged_by: flagged ? adminProfile.id : null,
        updated_at: now,
      })
      .eq('id', userId);
    if (error) throw error;

    await client.from('admin_audit_log').insert([
      {
        admin_id: adminProfile.id,
        action: flagged ? 'USER_FLAG' : 'USER_UNFLAG',
        target_user_id: userId,
        details: { note },
        created_at: now,
      },
    ]);

    return { user_id: userId, account_flagged: flagged, account_flag_note: note };
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
    const [usersRes, paymentsRes, disputesRes, kycPendingRes, tenantsRes, landlordsRes, partnerPendingRes, servicePendingRes, attachmentsPendingRes] =
      await Promise.all([
      client.from('profiles').select('id', { count: 'exact', head: true }),
      client.from('payments').select('id, amount_gross, status, commission_amount', { count: 'exact' }).limit(500),
      client.from('disputes').select('id, status', { count: 'exact' }).in('status', ['OPEN', 'UNDER_REVIEW']),
      client.from('profiles').select('id', { count: 'exact', head: true }).eq('kyc_status', 'PENDING'),
      client.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'TENANT'),
      client.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'LANDLORD'),
      client
        .from('landlord_onboarding_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'PENDING_APPROVAL'),
      client
        .from('attachment_requests')
        .select('id', { count: 'exact', head: true })
        .in('status', ['PENDING', 'ACCEPTED', 'IN_PROGRESS']),
      client.from('attachments').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
    ]);

    const payments = paymentsRes.data || [];
    const totalVolume = payments.reduce((sum: number, p: any) => sum + Number(p.amount_gross || 0), 0);
    const totalCommission = payments.reduce((sum: number, p: any) => sum + Number(p.commission_amount || 0), 0);
    const paidCount = payments.filter((p: any) => p.status === 'PAID').length;

    const countOrZero = (res: { count?: number | null; error?: unknown }) => (res.error ? 0 : res.count ?? 0);

    return {
      total_users: countOrZero(usersRes),
      pending_kyc: countOrZero(kycPendingRes),
      open_disputes: countOrZero(disputesRes),
      payment_count: paymentsRes.error ? 0 : paymentsRes.count ?? payments.length,
      paid_payment_count: paidCount,
      total_payment_volume: totalVolume,
      total_commission: totalCommission,
      active_tenants: countOrZero(tenantsRes),
      active_landlords: countOrZero(landlordsRes),
      pending_partner_approvals: countOrZero(partnerPendingRes),
      pending_service_requests: countOrZero(servicePendingRes),
      pending_attachments: countOrZero(attachmentsPendingRes),
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

  private async probeTable(client: { from: (table: string) => { select: (...args: any[]) => any } }, table: string) {
    const { count, error } = await client.from(table).select('id', { count: 'exact', head: true });
    if (error) {
      return { status: 'Degraded' as const, record_count: 0, error: error.message };
    }
    return { status: 'Operational' as const, record_count: count ?? 0, error: null };
  }

  async getSystemHealthSnapshot() {
    const client = this.supabaseService.getClient();
    const now = new Date().toISOString();
    const serviceDefs = [
      { key: 'payments', name: 'Payment Processing', table: 'payments' },
      { key: 'kyc', name: 'KYC Service', table: 'kyc_documents' },
      { key: 'credit', name: 'Credit Score Engine', table: 'credit_scores' },
      { key: 'reports', name: 'Report Generator', table: 'report_verifications' },
      { key: 'data', name: 'Data Pipeline', table: 'market_data_snapshots' },
      { key: 'notifications', name: 'Notifications', table: 'notifications' },
    ];

    const probes = await Promise.all(
      serviceDefs.map(async (def) => {
        const probe = await this.probeTable(client, def.table);
        return {
          key: def.key,
          name: def.name,
          table: def.table,
          status: probe.status,
          record_count: probe.record_count,
          uptime_30d: probe.status === 'Operational' ? 99.9 : 98.5,
          last_checked: now,
          probe_error: probe.error,
        };
      }),
    );

    const [auditRes, gdprRes] = await Promise.all([
      client.from('admin_audit_log').select('created_at, action, details').order('created_at', { ascending: false }).limit(50),
      client.from('gdpr_events').select('id', { count: 'exact', head: true }),
    ]);

    const auditRows = auditRes.data || [];
    const errorLike = auditRows.filter(
      (row: any) =>
        row.action?.toString().toUpperCase().includes('ERROR') ||
        row.action?.toString().toUpperCase().includes('FAIL'),
    );

    const chart = Array.from({ length: 7 }).map((_, i) => {
      const day = new Date();
      day.setDate(day.getDate() - (6 - i));
      const dayKey = day.toISOString().slice(0, 10);
      const dayAudits = auditRows.filter((row: any) => row.created_at?.slice(0, 10) === dayKey);
      const dayErrors = dayAudits.filter(
        (row: any) =>
          row.action?.toString().toUpperCase().includes('ERROR') ||
          row.action?.toString().toUpperCase().includes('FAIL'),
      ).length;
      return {
        day: dayKey,
        admin_actions: dayAudits.length,
        errors: dayErrors,
      };
    });

    const operationalCount = probes.filter((p) => p.status === 'Operational').length;
    const schedulerRuns = this.schedulerHeartbeat.snapshot();
    const staleCutoff = Date.now() - 36 * 60 * 60 * 1000;
    const alerts: { severity: string; code: string; message: string }[] = [];

    schedulerRuns.forEach((run) => {
      if (!run.ok) {
        alerts.push({
          severity: 'high',
          code: `SCHEDULER_${run.job.toUpperCase()}_FAILED`,
          message: run.message || `Scheduler job ${run.job} last run failed.`,
        });
      } else if (new Date(run.last_run_at).getTime() < staleCutoff) {
        alerts.push({
          severity: 'medium',
          code: `SCHEDULER_${run.job.toUpperCase()}_STALE`,
          message: `Scheduler job ${run.job} has not run in the last 36 hours.`,
        });
      }
    });

    if (!process.env.SMTP_HOST && !process.env.RESEND_API_KEY) {
      alerts.push({
        severity: 'medium',
        code: 'SMTP_NOT_CONFIGURED',
        message: 'No SMTP_HOST or RESEND_API_KEY — outbound email may be disabled.',
      });
    }

    if (operationalCount < probes.length) {
      alerts.push({
        severity: 'high',
        code: 'SERVICE_PROBE_DEGRADED',
        message: `${probes.length - operationalCount} service probe(s) are not operational.`,
      });
    }

    return {
      platform_status: operationalCount === probes.length && alerts.every((a) => a.severity !== 'high') ? 'Operational' : 'Degraded',
      services: probes,
      schedulers: schedulerRuns,
      alerts,
      summary: {
        services_operational: operationalCount,
        services_total: probes.length,
        admin_actions_logged: auditRows.length,
        gdpr_events: gdprRes.count ?? 0,
        open_alerts: alerts.length,
      },
      error_rate_7d: chart,
      recent_errors: errorLike.slice(0, 12).map((row: any) => ({
        timestamp: row.created_at,
        service: 'platform',
        error_type: row.action,
        affected_endpoint: row.details?.endpoint || row.details?.report_type || '—',
        resolution_status: 'LOGGED',
      })),
      recent_admin_actions: auditRows.slice(0, 15).map((row: any) => ({
        timestamp: row.created_at,
        action: row.action,
        details: row.details,
      })),
    };
  }

  async runOperationalSmokeTests() {
    const client = this.supabaseService.getClient();
    const checks: { name: string; pass: boolean; detail: string }[] = [];

    const tableProbes = ['payments', 'notifications', 'profiles', 'credit_scores'];
    for (const table of tableProbes) {
      const probe = await this.probeTable(client, table);
      checks.push({
        name: `db_${table}`,
        pass: probe.status === 'Operational',
        detail: probe.error || `${probe.record_count ?? 0} rows reachable`,
      });
    }

    const smtpConfigured = Boolean(process.env.SMTP_HOST || process.env.RESEND_API_KEY);
    checks.push({
      name: 'email_transport',
      pass: smtpConfigured,
      detail: smtpConfigured ? 'SMTP or Resend configured' : 'No SMTP_HOST / RESEND_API_KEY',
    });

    const schedulers = this.schedulerHeartbeat.snapshot();
    checks.push({
      name: 'scheduler_heartbeat',
      pass: schedulers.length > 0,
      detail:
        schedulers.length > 0
          ? `${schedulers.length} job(s) recorded since API start`
          : 'No scheduler runs yet (normal immediately after deploy)',
    });

    const { count: unreadCount, error: unreadErr } = await client
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false);
    checks.push({
      name: 'notifications_unread_query',
      pass: !unreadErr,
      detail: unreadErr ? unreadErr.message : `${unreadCount ?? 0} unread notifications`,
    });

    const { error: overdueErr } = await client
      .from('payments')
      .select('id')
      .eq('status', 'OVERDUE')
      .limit(1);
    checks.push({
      name: 'payments_overdue_query',
      pass: !overdueErr,
      detail: overdueErr ? overdueErr.message : 'Overdue payment query OK',
    });

    const passCount = checks.filter((c) => c.pass).length;
    return {
      passed: passCount === checks.length,
      pass_count: passCount,
      total: checks.length,
      checked_at: new Date().toISOString(),
      checks,
      schedulers,
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
    const { data: landlordProfile } = await client
      .from('profiles')
      .select('full_name')
      .eq('id', submission.landlord_id)
      .maybeSingle();

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

    if (action === 'APPROVE') {
      await this.notificationsService.sendPartnerApprovedEmail(
        submission.landlord_id,
        landlordProfile?.full_name || submission.full_legal_name || 'there',
      );
    } else {
      await this.notificationsService.sendPartnerRejectedEmail(
        submission.landlord_id,
        landlordProfile?.full_name || submission.full_legal_name || 'there',
        reason || 'Please update your documents and resubmit.',
      );
    }

    return { id: submissionId, status: nextStatus };
  }

  async getKycVerificationDetail(userId: string) {
    const client = this.supabaseService.getClient();
    const [profileRes, verificationRes, docsRes, flagsRes, auditRes] = await Promise.all([
      client
        .from('profiles')
        .select(
          'id, full_name, first_name, surname, phone, date_of_birth, gender, nationality, national_id_number, role, kyc_status, kyc_submitted_at, kyc_reviewed_at, kyc_reviewer_id, kyc_rejection_reason, address_street, address_region, address_city, address_postcode, address_country, residential_status',
        )
        .eq('id', userId)
        .maybeSingle(),
      client.from('kyc_verifications').select('*').eq('profile_id', userId).maybeSingle(),
      client.from('kyc_documents').select('id, doc_type, file_name, storage_path, uploaded_at, status').eq('user_id', userId).order('uploaded_at', { ascending: false }),
      client
        .from('kyc_flags')
        .select('id, flag_type, flag_note, flagged_at, dismissed_at, dismiss_note')
        .eq('user_id', userId)
        .order('flagged_at', { ascending: false }),
      client.from('kyc_audit_log').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    ]);

    if (profileRes.error) throw profileRes.error;
    if (verificationRes.error) throw verificationRes.error;
    if (docsRes.error) throw docsRes.error;
    if (flagsRes.error) throw flagsRes.error;
    if (auditRes.error) throw auditRes.error;

    const reviewerId = verificationRes.data?.reviewer_id || profileRes.data?.kyc_reviewer_id;
    let reviewerName: string | null = null;
    if (reviewerId) {
      const reviewerRes = await client.from('profiles').select('full_name').eq('id', reviewerId).maybeSingle();
      reviewerName = reviewerRes.data?.full_name || null;
    }

    const location_comparison = await this.kycService.getAdminLocationComparison(userId);

    return {
      profile: profileRes.data || null,
      verification: verificationRes.data
        ? {
            ...verificationRes.data,
            reviewer_name: reviewerName,
          }
        : null,
      location_comparison,
      documents: await Promise.all(
        (docsRes.data || []).map(async (doc: any) => ({
          ...doc,
          file_url: await createSignedStorageUrl(client, KYC_BUCKET, doc.storage_path),
        })),
      ),
      flags: flagsRes.data || [],
      audit: auditRes.data || [],
    };
  }

  async getEscrowOverview(limit = 10) {
    const client = this.supabaseService.getClient();
    const [accountsRes, txRes] = await Promise.all([
      client.from('escrow_accounts').select('*'),
      client.from('escrow_transactions').select('*').order('created_at', { ascending: false }).limit(limit),
    ]);

    if (accountsRes.error) throw accountsRes.error;
    if (txRes.error) throw txRes.error;

    const accounts = accountsRes.data || [];
    const totals = accounts.reduce(
      (acc: any, row: any) => {
        acc.total_held += Number(row.total_held || 0);
        acc.total_released += Number(row.total_released || 0);
        acc.total_refunded += Number(row.total_refunded || 0);
        acc.total_disputed += Number(row.total_disputed || 0);
        return acc;
      },
      { total_held: 0, total_released: 0, total_refunded: 0, total_disputed: 0 },
    );

    return {
      summary: {
        accounts_count: accounts.length,
        ...totals,
      },
      recent_transactions: txRes.data || [],
    };
  }
}
