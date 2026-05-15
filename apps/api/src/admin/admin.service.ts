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
          const userRes = await client.auth.admin.getUserById(profile.id);
          if (!userRes.error && userRes.data.user) {
            email = userRes.data.user.email ?? 'Unknown';
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
          const userRes = await client.auth.admin.getUserById(profile.id);
          if (!userRes.error && userRes.data.user) {
            email = userRes.data.user.email ?? 'Unknown';
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
}
