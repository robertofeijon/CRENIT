import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { createSignedStorageUrl, sanitizeStorageFileName } from '../supabase/storage.utils';

const KYC_BUCKET = 'kyc-documents';
const MAX_KYC_UPLOAD_BYTES = Number(process.env.MAX_KYC_UPLOAD_BYTES || 8 * 1024 * 1024);

export type KycDocumentType = 'government_id' | 'selfie' | 'income_proof' | 'signed_lease';

export const DOC_TYPE_TO_DB: Record<KycDocumentType, string> = {
  government_id: 'NATIONAL_ID_FRONT',
  selfie: 'SELFIE',
  income_proof: 'PROOF_OF_INCOME',
  signed_lease: 'LEASE_AGREEMENT',
};

export const DB_TYPE_TO_API: Record<string, KycDocumentType> = {
  NATIONAL_ID_FRONT: 'government_id',
  SELFIE: 'selfie',
  PROOF_OF_INCOME: 'income_proof',
  LEASE_AGREEMENT: 'signed_lease',
};

interface KycDocumentPayload {
  tenantId: string;
  documents: Array<{
    type: KycDocumentType;
    data: { filename: string; fileBase64: string };
  }>;
}

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(private readonly supabase: SupabaseService) {}

  getQueueStatus(): string {
    return 'KYC module is configured.';
  }

  async updateTenantIdentity(
    tenantId: string,
    payload: { national_id_number?: string; first_name?: string; surname?: string },
  ) {
    const client = this.supabase.getClient();
    const updates: Record<string, string> = {};
    if (payload.national_id_number?.trim()) updates.national_id_number = payload.national_id_number.trim();
    if (payload.first_name?.trim()) updates.first_name = payload.first_name.trim();
    if (payload.surname?.trim()) updates.surname = payload.surname.trim();
    if (payload.first_name && payload.surname) {
      updates.full_name = `${payload.first_name.trim()} ${payload.surname.trim()}`;
    }
    if (!Object.keys(updates).length) {
      return { updated: false };
    }
    const { error } = await client.from('profiles').update(updates).eq('id', tenantId);
    if (error) throw error;
    return { updated: true, ...updates };
  }

  async uploadDocument(payload: {
    tenantId: string;
    filename: string;
    fileBase64: string;
    doc_type: KycDocumentType;
  }) {
    return this.submitDocuments({
      tenantId: payload.tenantId,
      documents: [
        {
          type: payload.doc_type,
          data: { filename: payload.filename, fileBase64: payload.fileBase64 },
        },
      ],
    });
  }

  async submitDocuments(payload: KycDocumentPayload) {
    const client = this.supabase.getClient();
    const now = new Date().toISOString();
    const { data: beforeProfile } = await client.from('profiles').select('kyc_status').eq('id', payload.tenantId).maybeSingle();

    const uploaded = [];
    for (const document of payload.documents) {
      const buffer = Buffer.from(document.data.fileBase64, 'base64');
      if (buffer.length > MAX_KYC_UPLOAD_BYTES) {
        throw new BadRequestException(`File exceeds maximum size of ${MAX_KYC_UPLOAD_BYTES} bytes`);
      }
      const safeName = sanitizeStorageFileName(document.data.filename);
      const path = `${payload.tenantId}/${document.type}-${Date.now()}-${safeName}`;
      const res = await client.storage.from(KYC_BUCKET).upload(path, buffer, { upsert: false });
      if (res.error) throw res.error;

      const signedUrl = await createSignedStorageUrl(client, KYC_BUCKET, path);
      const row: Record<string, unknown> = {
        user_id: payload.tenantId,
        doc_type: DOC_TYPE_TO_DB[document.type],
        storage_path: path,
        file_name: document.data.filename,
        mime_type: 'application/octet-stream',
        uploaded_at: now,
        status: 'PENDING',
      };

      const { error } = await client.from('kyc_documents').insert([row]);
      if (error) {
        const missingStatus = error.code === '42703' || error.message?.includes('status');
        if (missingStatus) {
          delete row.status;
          const retry = await client.from('kyc_documents').insert([row]);
          if (retry.error) throw retry.error;
        } else {
          throw error;
        }
      }

      uploaded.push({
        type: document.type,
        file_name: document.data.filename,
        storage_path: path,
        file_url: signedUrl,
        status: 'PENDING',
      });
    }

    await this.evaluateQualityFlags(payload.tenantId, uploaded);

    const { error: profileError } = await client
      .from('profiles')
      .update({ kyc_status: 'PENDING', kyc_submitted_at: now, kyc_rejection_reason: null })
      .eq('id', payload.tenantId);
    if (profileError) throw profileError;

    await client.from('kyc_verifications').upsert(
      [
        {
          profile_id: payload.tenantId,
          status: 'PENDING',
          submitted_at: now,
          rejection_reason: null,
          metadata: { documents_uploaded: uploaded.length, rejected_doc_types: [] },
          updated_at: now,
        },
      ],
      { onConflict: 'profile_id' },
    );

    await client.from('kyc_audit_log').insert([
      {
        user_id: payload.tenantId,
        actor_id: payload.tenantId,
        action: beforeProfile?.kyc_status === 'REJECTED' ? 'KYC_RESUBMITTED' : 'KYC_SUBMITTED',
        previous_status: beforeProfile?.kyc_status ?? null,
        next_status: 'PENDING',
        metadata: { documents_uploaded: uploaded.length, types: uploaded.map((d) => d.type) },
      },
    ]);

    this.logger.log(`Submitted KYC documents for ${payload.tenantId}`);
    return { status: 'PENDING', submitted_at: now, documents: uploaded };
  }

  async resubmitDocuments(payload: KycDocumentPayload) {
    return this.submitDocuments(payload);
  }

  private async evaluateQualityFlags(tenantId: string, uploadedDocs: Array<{ type: string; file_name: string }>) {
    const client = this.supabase.getClient();
    const nowIso = new Date().toISOString();
    const flagsToInsert: Array<{ flag_type: string; flag_note: string }> = [];

    if (uploadedDocs.some((doc) => doc.type === 'selfie')) {
      flagsToInsert.push({
        flag_type: 'SELFIE_REVIEW',
        flag_note: 'Manual selfie review recommended.',
      });
    }

    if (!flagsToInsert.length) return;
    await client.from('kyc_flags').insert(
      flagsToInsert.map((flag) => ({
        user_id: tenantId,
        kyc_id: null,
        flag_type: flag.flag_type,
        flag_note: flag.flag_note,
        flagged_at: nowIso,
      })),
    );
  }

  private async summarizeDocuments(
    client: ReturnType<SupabaseService['getClient']>,
    documents: Array<{ doc_type: string; file_name: string; uploaded_at: string; storage_path: string; status?: string }>,
  ) {
    const latestByApiType = new Map<string, (typeof documents)[0] & { api_type: KycDocumentType }>();
    for (const doc of documents) {
      const apiType = DB_TYPE_TO_API[doc.doc_type];
      if (!apiType) continue;
      const existing = latestByApiType.get(apiType);
      if (!existing || new Date(doc.uploaded_at) > new Date(existing.uploaded_at)) {
        latestByApiType.set(apiType, { ...doc, api_type: apiType });
      }
    }

    const summarized = [];
    for (const doc of latestByApiType.values()) {
      const file_url = await createSignedStorageUrl(client, KYC_BUCKET, doc.storage_path);
      summarized.push({
        type: doc.api_type,
        doc_type: doc.doc_type,
        file_name: doc.file_name,
        uploaded_at: doc.uploaded_at,
        storage_path: doc.storage_path,
        status: doc.status ?? 'PENDING',
        file_url,
        needs_reupload: (doc.status ?? 'PENDING') === 'REJECTED',
      });
    }
    return summarized;
  }

  async getStatus(tenantId: string) {
    const client = this.supabase.getClient();

    const { data: profile, error } = await client
      .from('profiles')
      .select(
        'id, full_name, first_name, surname, national_id_number, role, kyc_status, kyc_rejection_reason, kyc_submitted_at, kyc_approved_at, account_flagged, account_flag_note',
      )
      .eq('id', tenantId)
      .single();

    if (error) throw error;

    let docsData: any[] = [];
    const docsRes = await client
      .from('kyc_documents')
      .select('doc_type, file_name, uploaded_at, storage_path, status')
      .eq('user_id', tenantId)
      .order('uploaded_at', { ascending: false })
      .limit(50);

    if (docsRes.error) {
      const missingStatus = docsRes.error.code === '42703' || docsRes.error.message?.includes('status');
      if (missingStatus) {
        const fallback = await client
          .from('kyc_documents')
          .select('doc_type, file_name, uploaded_at, storage_path')
          .eq('user_id', tenantId)
          .order('uploaded_at', { ascending: false })
          .limit(50);
        if (fallback.error) throw fallback.error;
        docsData = (fallback.data || []).map((d: any) => ({ ...d, status: 'PENDING' }));
      } else {
        throw docsRes.error;
      }
    } else {
      docsData = docsRes.data || [];
    }

    const { data: verification } = await client
      .from('kyc_verifications')
      .select('*')
      .eq('profile_id', tenantId)
      .maybeSingle();

    const rejectedDocTypes =
      (verification?.metadata as { rejected_doc_types?: KycDocumentType[] })?.rejected_doc_types ?? [];

    const documents = (await this.summarizeDocuments(client, docsData)).map((doc) => ({
      ...doc,
      needs_reupload:
        doc.needs_reupload ||
        (profile.kyc_status === 'REJECTED' && rejectedDocTypes.includes(doc.type as KycDocumentType)),
    }));

    return {
      profile,
      verification: verification || null,
      rejected_doc_types: rejectedDocTypes,
      documents,
    };
  }
}
