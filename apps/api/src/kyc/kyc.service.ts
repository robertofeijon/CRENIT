import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

type KycDocumentType = 'government_id' | 'selfie' | 'income_proof' | 'address_proof';

const DOC_TYPE_TO_DB: Record<KycDocumentType, string> = {
  government_id: 'NATIONAL_ID_FRONT',
  selfie: 'SELFIE',
  income_proof: 'PROOF_OF_INCOME',
  address_proof: 'BANK_STATEMENT',
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

  async uploadDocument(payload: {
    tenantId: string;
    filename: string;
    fileBase64: string;
    doc_type?: KycDocumentType;
  }) {
    const docType = payload.doc_type ?? 'income_proof';
    return this.submitDocuments({
      tenantId: payload.tenantId,
      documents: [
        {
          type: docType,
          data: { filename: payload.filename, fileBase64: payload.fileBase64 },
        },
      ],
    });
  }

  async submitDocuments(payload: KycDocumentPayload) {
    const client = this.supabase.getClient();
    const now = new Date().toISOString();
    const bucket = 'kyc-documents';
    const { data: beforeProfile } = await client.from('profiles').select('kyc_status').eq('id', payload.tenantId).maybeSingle();

    const uploaded = [];
    for (const document of payload.documents) {
      const buffer = Buffer.from(document.data.fileBase64, 'base64');
      const path = `${payload.tenantId}/${document.type}-${Date.now()}-${document.data.filename}`;
      const res = await client.storage.from(bucket).upload(path, buffer, { upsert: false });
      if (res.error) throw res.error;

      const publicUrl = client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      const { error } = await client.from('kyc_documents').insert([
        {
          user_id: payload.tenantId,
          doc_type: DOC_TYPE_TO_DB[document.type],
          storage_path: path,
          file_name: document.data.filename,
          mime_type: 'application/octet-stream',
          uploaded_at: now,
        },
      ]);
      if (error) throw error;

      uploaded.push({
        type: document.type,
        file_name: document.data.filename,
        storage_path: path,
        file_url: publicUrl,
      });
    }

    await this.evaluateQualityFlags(payload.tenantId, uploaded);

    const { error: profileError } = await client
      .from('profiles')
      .update({ kyc_status: 'PENDING', kyc_submitted_at: now, kyc_rejection_reason: null })
      .eq('id', payload.tenantId);
    if (profileError) throw profileError;

    await client.from('kyc_audit_log').insert([
      {
        user_id: payload.tenantId,
        actor_id: payload.tenantId,
        action: 'KYC_SUBMITTED',
        previous_status: beforeProfile?.kyc_status ?? null,
        next_status: 'PENDING',
        metadata: { documents_uploaded: uploaded.length },
      },
    ]);

    this.logger.log(`Submitted KYC documents for ${payload.tenantId}`);

    return {
      status: 'PENDING',
      submitted_at: now,
      documents: uploaded,
    };
  }

  async resubmitDocuments(payload: KycDocumentPayload) {
    const result = await this.submitDocuments(payload);
    const client = this.supabase.getClient();
    await client.from('kyc_audit_log').insert([
      {
        user_id: payload.tenantId,
        actor_id: payload.tenantId,
        action: 'KYC_RESUBMITTED',
        previous_status: 'REJECTED',
        next_status: 'PENDING',
        metadata: { documents_uploaded: payload.documents.length },
      },
    ]);
    return {
      ...result,
      message: 'Documents resubmitted for review',
    };
  }

  private async evaluateQualityFlags(tenantId: string, uploadedDocs: Array<{ type: string; file_name: string; uploaded_at?: string }>) {
    const client = this.supabase.getClient();
    const nowIso = new Date().toISOString();
    const { data: profile } = await client
      .from('profiles')
      .select('id, national_id_number')
      .eq('id', tenantId)
      .maybeSingle();

    const flagsToInsert: Array<{ flag_type: string; flag_note: string }> = [];

    // Placeholder biometric review flag - required as future hook.
    if (uploadedDocs.some((doc) => doc.type === 'selfie')) {
      flagsToInsert.push({
        flag_type: 'SELFIE_SIMILARITY_LOW',
        flag_note: 'Placeholder biometric check required. Similarity model not yet integrated.',
      });
    }

    // Income proof older than 3 months, if filename embeds an old date or known stale marker.
    const incomeDoc = uploadedDocs.find((doc) => doc.type === 'income_proof');
    if (incomeDoc && /stale|old|expired/i.test(incomeDoc.file_name || '')) {
      flagsToInsert.push({
        flag_type: 'INCOME_DOC_OLDER_THAN_3_MONTHS',
        flag_note: 'Income proof appears outdated based on filename metadata.',
      });
    }

    // ID expiry check if extractable from filename hint.
    const idDoc = uploadedDocs.find((doc) => doc.type === 'government_id');
    if (idDoc && /expired/i.test(idDoc.file_name || '')) {
      flagsToInsert.push({
        flag_type: 'ID_DOCUMENT_EXPIRED',
        flag_note: 'ID document appears expired based on extractable filename hint.',
      });
    }

    // Duplicate identity check.
    if (profile?.national_id_number) {
      const { data: duplicates } = await client
        .from('profiles')
        .select('id')
        .eq('national_id_number', profile.national_id_number)
        .neq('id', tenantId)
        .limit(1);
      if ((duplicates || []).length > 0) {
        flagsToInsert.push({
          flag_type: 'DUPLICATE_IDENTITY_NUMBER',
          flag_note: 'National ID number is associated with another profile.',
        });
      }
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

  async getStatus(tenantId: string) {
    const client = this.supabase.getClient();

    const { data: profile, error } = await client
      .from('profiles')
      .select('id, full_name, role, kyc_status, kyc_rejection_reason, kyc_submitted_at, kyc_approved_at')
      .eq('id', tenantId)
      .single();

    if (error) throw error;

    const { data: documents, error: docsError } = await client
      .from('kyc_documents')
      .select('doc_type, file_name, uploaded_at, storage_path')
      .eq('user_id', tenantId)
      .order('uploaded_at', { ascending: false })
      .limit(20);

    if (docsError) throw docsError;

    const normalizedDocuments = (documents || []).map((doc: { doc_type: string; file_name: string; uploaded_at: string; storage_path: string }) => ({
      type: doc.doc_type,
      file_name: doc.file_name,
      uploaded_at: doc.uploaded_at,
      storage_path: doc.storage_path,
    }));

    return {
      profile,
      documents: normalizedDocuments,
    };
  }
}
