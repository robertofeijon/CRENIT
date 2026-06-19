import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { createSignedStorageUrl, sanitizeStorageFileName } from '../supabase/storage.utils';
import {
  FULL_LANDLORD_CONSENT_VERSION,
  LITE_LANDLORD_CONSENT_VERSION,
  resolveLandlordTierFromManagedCount,
} from './lite-landlord.util';

const KYC_BUCKET = 'kyc-documents';
const MAX_BYTES = Number(process.env.MAX_KYC_UPLOAD_BYTES || 8 * 1024 * 1024);

export type LandlordAccountType = 'INDIVIDUAL' | 'COMPANY';

export type LandlordKycDocType =
  | 'government_id'
  | 'company_registration'
  | 'proof_of_address'
  | 'proof_of_property_ownership'
  | 'selfie';

export const LANDLORD_KYC_DOC_TYPES: LandlordKycDocType[] = [
  'government_id',
  'company_registration',
  'proof_of_address',
  'proof_of_property_ownership',
  'selfie',
];

const DOC_TO_DB: Record<LandlordKycDocType, string> = {
  government_id: 'NATIONAL_ID_FRONT',
  company_registration: 'EMPLOYER_LETTER',
  proof_of_address: 'PROOF_OF_ADDRESS',
  proof_of_property_ownership: 'BANK_STATEMENT',
  selfie: 'SELFIE',
};

const DB_TO_API: Record<string, LandlordKycDocType> = {
  NATIONAL_ID_FRONT: 'government_id',
  EMPLOYER_LETTER: 'company_registration',
  PROOF_OF_ADDRESS: 'proof_of_address',
  BANK_STATEMENT: 'proof_of_property_ownership',
  SELFIE: 'selfie',
};

export type LandlordKycStep1 = {
  first_name: string;
  surname: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  phone: string;
  account_type: LandlordAccountType;
  company_name?: string;
  registration_number?: string;
  vat_number?: string;
};

export type LandlordKycStep2 = {
  country: string;
  region: string;
  city: string;
  street_address: string;
  postal_code?: string;
  properties_managed_count: number;
  ownership_status: string;
};

@Injectable()
export class LandlordKycService {
  private readonly logger = new Logger(LandlordKycService.name);

  constructor(private readonly supabase: SupabaseService) {}

  displayStatus(partnerStatus?: string | null, hasSubmission?: boolean): string {
    const s = (partnerStatus || '').toUpperCase();
    if (s === 'APPROVED') return 'VERIFIED';
    if (s === 'REJECTED') return 'REJECTED';
    if (s === 'PENDING_REVIEW' || s === 'PENDING_APPROVAL' || (hasSubmission && s === 'PENDING')) {
      return 'PENDING_REVIEW';
    }
    return 'UNVERIFIED';
  }

  isVerified(partnerStatus?: string | null) {
    return (partnerStatus || '').toUpperCase() === 'APPROVED';
  }

  async getStatus(landlordUserId: string) {
    const client = this.supabase.getClient();
    const { data: profile, error } = await client
      .from('profiles')
      .select(
        'id, full_name, first_name, surname, phone, date_of_birth, gender, nationality, role, kyc_status, kyc_rejection_reason, kyc_submitted_at, partner_approval_status, address_street, address_region, address_city, address_postcode, address_country',
      )
      .eq('id', landlordUserId)
      .single();
    if (error) throw error;

    const { data: landlordProfile } = await client
      .from('landlord_profiles')
      .select(
        'business_name, account_type, vat_number, properties_managed_count, ownership_status, landlord_kyc_draft, partner_status',
      )
      .eq('user_id', landlordUserId)
      .maybeSingle();

    const { data: authUser } = await client.auth.admin.getUserById(landlordUserId).catch(() => ({ data: { user: null } as any }));

    const docsRes = await client
      .from('kyc_documents')
      .select('doc_type, file_name, uploaded_at, storage_path, status')
      .eq('user_id', landlordUserId)
      .order('uploaded_at', { ascending: false });

    const { data: verification } = await client
      .from('kyc_verifications')
      .select('*')
      .eq('profile_id', landlordUserId)
      .maybeSingle();

    const metadata = (verification?.metadata as Record<string, unknown>) || {};
    const rejectedDocTypes = (metadata.rejected_doc_types as LandlordKycDocType[]) || [];
    const rejectedSteps = (metadata.rejected_steps as number[]) || [];

    const documents = await this.summarizeDocs(client, docsRes.data || []);

    const display = this.displayStatus(
      profile.partner_approval_status,
      Boolean(profile.kyc_submitted_at || verification?.submitted_at),
    );

    return {
      profile: {
        ...profile,
        email: authUser?.user?.email ?? null,
        account_type: landlordProfile?.account_type,
        company_name: landlordProfile?.business_name,
        vat_number: landlordProfile?.vat_number,
        registration_number: metadata.registration_number,
        properties_managed_count: landlordProfile?.properties_managed_count,
        ownership_status: landlordProfile?.ownership_status,
      },
      verification_status: display,
      partner_approval_status: profile.partner_approval_status,
      wizard_draft: landlordProfile?.landlord_kyc_draft,
      rejected_doc_types: rejectedDocTypes,
      rejected_steps: rejectedSteps,
      documents,
    };
  }

  async saveDraft(landlordUserId: string, step: 1 | 2, payload: { step1?: Partial<LandlordKycStep1>; step2?: Partial<LandlordKycStep2> }) {
    const client = this.supabase.getClient();
    const status = await this.getStatus(landlordUserId);
    if (status.verification_status === 'VERIFIED') {
      throw new BadRequestException('Verification already complete.');
    }
    if (status.verification_status === 'PENDING_REVIEW') {
      throw new BadRequestException('Verification is under review.');
    }
    // REJECTED and UNVERIFIED may save drafts

    const { data: lp } = await client
      .from('landlord_profiles')
      .select('landlord_kyc_draft')
      .eq('user_id', landlordUserId)
      .maybeSingle();

    const draft = { ...((lp?.landlord_kyc_draft as object) || {}), step };

    const profileUpdates: Record<string, unknown> = {};
    const landlordUpdates: Record<string, unknown> = { landlord_kyc_draft: draft };

    if (step === 1 && payload.step1) {
      const s = payload.step1;
      if (s.first_name?.trim()) profileUpdates.first_name = s.first_name.trim();
      if (s.surname?.trim()) profileUpdates.surname = s.surname.trim();
      if (s.first_name?.trim() && s.surname?.trim()) {
        profileUpdates.full_name = `${s.first_name.trim()} ${s.surname.trim()}`;
      }
      if (s.date_of_birth) profileUpdates.date_of_birth = s.date_of_birth;
      if (s.gender?.trim()) profileUpdates.gender = s.gender.trim();
      if (s.nationality?.trim()) profileUpdates.nationality = s.nationality.trim();
      if (s.phone?.trim()) profileUpdates.phone = s.phone.trim();
      if (s.account_type) landlordUpdates.account_type = s.account_type;
      if (s.company_name?.trim()) landlordUpdates.business_name = s.company_name.trim();
      if (s.vat_number?.trim()) landlordUpdates.vat_number = s.vat_number.trim();
      Object.assign(draft, { step1: s });
    }

    if (step === 2 && payload.step2) {
      const s = payload.step2;
      if (s.country?.trim()) profileUpdates.address_country = s.country.trim();
      if (s.region?.trim()) profileUpdates.address_region = s.region.trim();
      if (s.city?.trim()) profileUpdates.address_city = s.city.trim();
      if (s.street_address?.trim()) profileUpdates.address_street = s.street_address.trim();
      if (s.postal_code?.trim()) profileUpdates.address_postcode = s.postal_code.trim();
      if (s.properties_managed_count != null) landlordUpdates.properties_managed_count = s.properties_managed_count;
      if (s.ownership_status?.trim()) landlordUpdates.ownership_status = s.ownership_status.trim();
      Object.assign(draft, { step2: s });
    }

    if (Object.keys(profileUpdates).length) {
      await client.from('profiles').update(profileUpdates).eq('id', landlordUserId);
    }
    await client.from('landlord_profiles').update(landlordUpdates).eq('user_id', landlordUserId);

    return { saved: true, draft };
  }

  async submitWizard(
    landlordUserId: string,
    payload: {
      step1: LandlordKycStep1;
      step2: LandlordKycStep2;
      documents: Partial<Record<LandlordKycDocType, { filename: string; fileBase64: string }>>;
      consent_text_version?: string;
    },
  ) {
    this.validateStep1(payload.step1);
    this.validateStep2(payload.step2);

    const client = this.supabase.getClient();
    const current = await this.getStatus(landlordUserId);
    const isResubmit = current.verification_status === 'REJECTED';
    const requiredDocs = this.requiredDocs(payload.step1.account_type);
    const rejectedOnly = (current.rejected_doc_types?.length ? current.rejected_doc_types : requiredDocs) as LandlordKycDocType[];
    const docsToUpload = isResubmit ? rejectedOnly : requiredDocs;

    const existingTypes = new Set((current.documents || []).map((d: { type: string }) => d.type));

    for (const type of docsToUpload) {
      const file = payload.documents[type];
      if (file?.filename && file?.fileBase64) continue;
      const wasRejected = current.rejected_doc_types?.includes(type);
      if (isResubmit && existingTypes.has(type) && !wasRejected) continue;
      throw new BadRequestException(`Missing document: ${type}`);
    }

    const typesWithFiles = docsToUpload.filter((t) => payload.documents[t]?.fileBase64);
    if (!isResubmit && typesWithFiles.length < docsToUpload.length) {
      throw new BadRequestException('All required documents must be uploaded.');
    }
    if (isResubmit && !typesWithFiles.length) {
      throw new BadRequestException('Upload corrected documents for rejected items.');
    }

    await this.saveDraft(landlordUserId, 1, { step1: payload.step1 });
    await this.saveDraft(landlordUserId, 2, { step2: payload.step2 });

    const uploaded = typesWithFiles.length
      ? await this.storeDocuments(landlordUserId, typesWithFiles, payload.documents)
      : [];
    const now = new Date().toISOString();

    const metadata = {
      applicant_role: 'LANDLORD',
      account_type: payload.step1.account_type,
      registration_number: payload.step1.registration_number?.trim() || null,
      company_name: payload.step1.company_name?.trim() || null,
      property: payload.step2,
      documents_uploaded: uploaded.length,
      rejected_doc_types: [] as LandlordKycDocType[],
      rejected_steps: [] as number[],
    };

    const landlordTier = resolveLandlordTierFromManagedCount(payload.step2.properties_managed_count);
    const consentVersion =
      payload.consent_text_version ||
      (landlordTier === 'LITE' ? LITE_LANDLORD_CONSENT_VERSION : FULL_LANDLORD_CONSENT_VERSION);

    await client.from('profiles').update({
      kyc_status: 'PENDING_REVIEW',
      partner_approval_status: 'PENDING_REVIEW',
      kyc_submitted_at: now,
      kyc_rejection_reason: null,
      landlord_tier: landlordTier,
    }).eq('id', landlordUserId);

    await client.from('landlord_profiles').update({
      partner_status: 'PENDING',
      landlord_kyc_draft: null,
    }).eq('user_id', landlordUserId);

    if (consentVersion) {
      await client.from('partner_consents').insert([
        {
          landlord_id: landlordUserId,
          consent_text_version: consentVersion,
        },
      ]);
    }

    await client.from('kyc_verifications').upsert(
      [
        {
          profile_id: landlordUserId,
          status: 'PENDING',
          submitted_at: now,
          rejection_reason: null,
          metadata,
          updated_at: now,
        },
      ],
      { onConflict: 'profile_id' },
    );

    await client.from('kyc_audit_log').insert([
      {
        user_id: landlordUserId,
        actor_id: landlordUserId,
        action: 'LANDLORD_KYC_SUBMITTED',
        previous_status: 'UNVERIFIED',
        next_status: 'PENDING_REVIEW',
        metadata,
      },
    ]);

    this.logger.log(`Landlord KYC submitted: ${landlordUserId}`);
    return { status: 'PENDING_REVIEW', submitted_at: now, documents: uploaded };
  }

  private requiredDocs(accountType: LandlordAccountType): LandlordKycDocType[] {
    const idDoc: LandlordKycDocType = accountType === 'COMPANY' ? 'company_registration' : 'government_id';
    return [idDoc, 'proof_of_address', 'proof_of_property_ownership', 'selfie'];
  }

  private validateStep1(s: LandlordKycStep1) {
    if (!s.first_name?.trim() || !s.surname?.trim()) throw new BadRequestException('First and last name required.');
    if (!s.date_of_birth || !s.gender?.trim() || !s.nationality?.trim() || !s.phone?.trim()) {
      throw new BadRequestException('Complete all personal fields.');
    }
    if (!s.account_type) throw new BadRequestException('Account type is required.');
    if (s.account_type === 'COMPANY' && !s.company_name?.trim()) {
      throw new BadRequestException('Company name is required for company accounts.');
    }
  }

  private validateStep2(s: LandlordKycStep2) {
    if (!s.country?.trim() || !s.region?.trim() || !s.city?.trim() || !s.street_address?.trim()) {
      throw new BadRequestException('Complete property location fields.');
    }
    if (!s.ownership_status?.trim()) throw new BadRequestException('Ownership status is required.');
    if (s.properties_managed_count == null || s.properties_managed_count < 1) {
      throw new BadRequestException('Number of properties must be at least 1.');
    }
  }

  private async storeDocuments(
    landlordUserId: string,
    types: LandlordKycDocType[],
    files: Partial<Record<LandlordKycDocType, { filename: string; fileBase64: string }>>,
  ) {
    const client = this.supabase.getClient();
    const now = new Date().toISOString();
    const uploaded = [];

    for (const type of types) {
      const file = files[type]!;
      const buffer = Buffer.from(file.fileBase64, 'base64');
      if (buffer.length > MAX_BYTES) throw new BadRequestException(`File too large: ${type}`);
      const safeName = sanitizeStorageFileName(file.filename);
      const path = `${landlordUserId}/landlord-${type}-${Date.now()}-${safeName}`;
      const res = await client.storage.from(KYC_BUCKET).upload(path, buffer, { upsert: false });
      if (res.error) throw res.error;

      const row: Record<string, unknown> = {
        user_id: landlordUserId,
        doc_type: DOC_TO_DB[type],
        storage_path: path,
        file_name: file.filename,
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

      uploaded.push({ type, file_name: file.filename, storage_path: path });
    }

    return uploaded;
  }

  private async summarizeDocs(client: ReturnType<SupabaseService['getClient']>, docs: any[]) {
    const latest = new Map<string, any>();
    for (const doc of docs) {
      const apiType = DB_TO_API[doc.doc_type];
      if (!apiType) continue;
      const existing = latest.get(apiType);
      if (!existing || new Date(doc.uploaded_at) > new Date(existing.uploaded_at)) {
        latest.set(apiType, doc);
      }
    }
    const out = [];
    for (const [type, doc] of latest) {
      const file_url = await createSignedStorageUrl(client, KYC_BUCKET, doc.storage_path);
      out.push({
        type,
        file_name: doc.file_name,
        uploaded_at: doc.uploaded_at,
        status: doc.status ?? 'PENDING',
        file_url,
        needs_reupload: (doc.status ?? 'PENDING') === 'REJECTED',
      });
    }
    return out;
  }
}
