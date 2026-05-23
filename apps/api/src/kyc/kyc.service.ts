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

    const { error: profileError } = await client
      .from('profiles')
      .update({ kyc_status: 'PENDING', kyc_submitted_at: now, kyc_rejection_reason: null })
      .eq('id', payload.tenantId);
    if (profileError) throw profileError;

    this.logger.log(`Submitted KYC documents for ${payload.tenantId}`);

    return {
      status: 'PENDING',
      submitted_at: now,
      documents: uploaded,
    };
  }

  async resubmitDocuments(payload: KycDocumentPayload) {
    const result = await this.submitDocuments(payload);
    return {
      ...result,
      message: 'Documents resubmitted for review',
    };
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
