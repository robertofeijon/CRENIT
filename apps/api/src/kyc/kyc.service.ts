import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { createSignedStorageUrl, sanitizeStorageFileName } from '../supabase/storage.utils';
import {
  compareResidence,
  residenceFromLandlordKycStep2,
  residenceFromLandlordProfileAddress,
  residenceFromProperty,
  resolveLandlordReferenceForTenantCheck,
  type LandlordKycPropertyInput,
  type ResidenceInput,
} from './kyc-location.util';

const KYC_BUCKET = 'kyc-documents';
const MAX_KYC_UPLOAD_BYTES = Number(process.env.MAX_KYC_UPLOAD_BYTES || 8 * 1024 * 1024);

export type KycDocumentType = 'government_id' | 'selfie' | 'income_proof' | 'proof_of_address';

export const REQUIRED_KYC_DOCUMENT_TYPES: KycDocumentType[] = [
  'government_id',
  'selfie',
  'income_proof',
  'proof_of_address',
];

/** @deprecated Legacy lease doc — still readable for old submissions */
export type LegacyKycDocumentType = 'signed_lease';

export const DOC_TYPE_TO_DB: Record<KycDocumentType, string> = {
  government_id: 'NATIONAL_ID_FRONT',
  selfie: 'SELFIE',
  income_proof: 'PROOF_OF_INCOME',
  proof_of_address: 'PROOF_OF_ADDRESS',
};

export const DB_TYPE_TO_API: Record<string, KycDocumentType | LegacyKycDocumentType> = {
  NATIONAL_ID_FRONT: 'government_id',
  SELFIE: 'selfie',
  PROOF_OF_INCOME: 'income_proof',
  PROOF_OF_ADDRESS: 'proof_of_address',
  LEASE_AGREEMENT: 'signed_lease',
};

interface KycDocumentPayload {
  tenantId: string;
  documents: Array<{
    type: KycDocumentType;
    data: { filename: string; fileBase64: string };
  }>;
}

export type KycPersonalInput = {
  first_name: string;
  surname: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  phone: string;
  national_id_number?: string;
};

export type KycResidenceInput = ResidenceInput & {
  country: string;
  region: string;
  city: string;
  street_address: string;
  postal_code?: string;
  residential_status: string;
};

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(private readonly supabase: SupabaseService) {}

  getQueueStatus(): string {
    return 'KYC module is configured.';
  }

  async getTenantEmail(tenantId: string): Promise<string | null> {
    const client = this.supabase.getClient();
    const { data } = await client.auth.admin.getUserById(tenantId).catch(() => ({ data: { user: null } as any }));
    return data?.user?.email ?? null;
  }

  async saveWizardDraft(
    tenantId: string,
    step: 1 | 2,
    payload: { personal?: Partial<KycPersonalInput>; residence?: Partial<KycResidenceInput> },
  ) {
    const client = this.supabase.getClient();
    const { data: profile } = await client.from('profiles').select('kyc_wizard_draft, kyc_status').eq('id', tenantId).maybeSingle();
    if (profile?.kyc_status === 'PENDING_REVIEW' || profile?.kyc_status === 'PENDING') {
      throw new BadRequestException('KYC is already under review.');
    }
    if (profile?.kyc_status === 'APPROVED' || profile?.kyc_status === 'VERIFIED') {
      throw new BadRequestException('KYC is already verified.');
    }

    const draft = { ...((profile?.kyc_wizard_draft as object) || {}), step };
    if (payload.personal) Object.assign(draft, { personal: payload.personal });
    if (payload.residence) Object.assign(draft, { residence: payload.residence });

    const profileUpdates: Record<string, unknown> = { kyc_wizard_draft: draft };

    if (step === 1 && payload.personal) {
      const p = payload.personal;
      if (p.first_name?.trim()) profileUpdates.first_name = p.first_name.trim();
      if (p.surname?.trim()) profileUpdates.surname = p.surname.trim();
      if (p.first_name?.trim() && p.surname?.trim()) {
        profileUpdates.full_name = `${p.first_name.trim()} ${p.surname.trim()}`;
      }
      if (p.national_id_number?.trim()) profileUpdates.national_id_number = p.national_id_number.trim();
      if (p.date_of_birth) profileUpdates.date_of_birth = p.date_of_birth;
      if (p.gender?.trim()) profileUpdates.gender = p.gender.trim();
      if (p.nationality?.trim()) profileUpdates.nationality = p.nationality.trim();
      if (p.phone?.trim()) profileUpdates.phone = p.phone.trim();
    }

    if (step === 2 && payload.residence) {
      const r = payload.residence;
      if (r.country?.trim()) profileUpdates.address_country = r.country.trim();
      if (r.region?.trim()) profileUpdates.address_region = r.region.trim();
      if (r.city?.trim()) profileUpdates.address_city = r.city.trim();
      if (r.street_address?.trim()) profileUpdates.address_street = r.street_address.trim();
      if (r.postal_code?.trim()) profileUpdates.address_postcode = r.postal_code.trim();
      if (r.residential_status?.trim()) profileUpdates.residential_status = r.residential_status.trim();
    }

    const { error } = await client.from('profiles').update(profileUpdates).eq('id', tenantId);
    if (error) throw error;
    return { saved: true, draft };
  }

  async getLandlordReferenceResidence(tenantId: string): Promise<ResidenceInput | null> {
    const resolved = await this.resolveLandlordReferenceForTenant(tenantId);
    return resolved?.residence ?? null;
  }

  /**
   * Resolves landlord reference location for tenant KYC cross-check.
   * Prefers landlord KYC wizard step-2 primary property address.
   */
  async resolveLandlordReferenceForTenant(tenantId: string) {
    const client = this.supabase.getClient();
    const { data: lease } = await client
      .from('leases')
      .select('tenant_residence, unit_id, landlord_id, status')
      .eq('tenant_id', tenantId)
      .in('status', ['ACTIVE', 'PENDING'])
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lease) return null;

    const leaseTenantResidence =
      lease.tenant_residence && typeof lease.tenant_residence === 'object'
        ? (lease.tenant_residence as ResidenceInput)
        : null;

    let leasedProperty: ResidenceInput | null = null;
    if (lease.unit_id) {
      const { data: unit } = await client.from('units').select('property_id').eq('id', lease.unit_id).maybeSingle();
      if (unit?.property_id) {
        const { data: property } = await client
          .from('properties')
          .select('address_street, address_suburb, address_city, address_postcode, address_country')
          .eq('id', unit.property_id)
          .maybeSingle();
        if (property) leasedProperty = residenceFromProperty(property);
      }
    }

    let landlordKycStep2: ResidenceInput | null = null;
    let landlordProfileAddress: ResidenceInput | null = null;

    if (lease.landlord_id) {
      const { data: landlordProfile } = await client
        .from('landlord_profiles')
        .select('user_id')
        .eq('id', lease.landlord_id)
        .maybeSingle();

      const landlordUserId = landlordProfile?.user_id;
      if (landlordUserId) {
        const [verificationRes, profileRes] = await Promise.all([
          client.from('kyc_verifications').select('metadata').eq('profile_id', landlordUserId).maybeSingle(),
          client
            .from('profiles')
            .select('address_street, address_region, address_city, address_postcode, address_country')
            .eq('id', landlordUserId)
            .maybeSingle(),
        ]);

        const meta = (verificationRes.data?.metadata as Record<string, unknown>) || {};
        const kycProperty = meta.property as LandlordKycPropertyInput | undefined;
        landlordKycStep2 = residenceFromLandlordKycStep2(kycProperty);
        landlordProfileAddress = residenceFromLandlordProfileAddress(profileRes.data);
      }
    }

    return resolveLandlordReferenceForTenantCheck({
      landlordKycStep2,
      landlordProfileAddress,
      leaseTenantResidence,
      leasedProperty,
    });
  }

  async submitWizard(
    tenantId: string,
    payload: {
      personal: KycPersonalInput;
      residence: KycResidenceInput;
      documents: Record<KycDocumentType, { filename: string; fileBase64: string }>;
      market_data_consent?: boolean;
    },
  ) {
    this.validatePersonal(payload.personal);
    this.validateResidence(payload.residence);

    const documents: KycDocumentPayload['documents'] = REQUIRED_KYC_DOCUMENT_TYPES.map((type) => {
      const file = payload.documents[type];
      if (!file?.filename || !file?.fileBase64) {
        throw new BadRequestException(`Missing file for ${type}`);
      }
      return { type, data: file };
    });

    await this.saveWizardDraft(tenantId, 1, { personal: payload.personal });
    await this.saveWizardDraft(tenantId, 2, { residence: payload.residence });

    const landlordReference = await this.resolveLandlordReferenceForTenant(tenantId);
    const landlordResidence = landlordReference?.residence ?? null;
    const locationCheck = compareResidence(payload.residence, landlordResidence);

    const uploaded = await this.storeDocuments(tenantId, documents);
    const now = new Date().toISOString();
    const client = this.supabase.getClient();
    const { data: beforeProfile } = await client.from('profiles').select('kyc_status').eq('id', tenantId).maybeSingle();

    await this.evaluateQualityFlags(tenantId, uploaded);

    if (!locationCheck.match && locationCheck.compared) {
      await client.from('kyc_flags').insert([
        {
          user_id: tenantId,
          kyc_id: null,
          flag_type: 'LOCATION_MISMATCH',
          flag_note: `Tenant vs ${landlordReference?.label || 'landlord reference'} similarity ${Math.round(locationCheck.score * 100)}% (threshold 72%).`,
          flagged_at: now,
        },
      ]);
    }

    const verificationMetadata = {
      documents_uploaded: uploaded.length,
      rejected_doc_types: [] as KycDocumentType[],
      tenant_residence: payload.residence,
      landlord_residence: landlordResidence,
      landlord_reference_source: landlordReference?.source ?? null,
      landlord_reference_label: landlordReference?.label ?? null,
      location_match: locationCheck.match,
      location_match_score: locationCheck.score,
      location_compared: locationCheck.compared,
      market_data_consent: Boolean(payload.market_data_consent),
    };

    const { error: profileError } = await client
      .from('profiles')
      .update({
        kyc_status: 'PENDING_REVIEW',
        kyc_submitted_at: now,
        kyc_rejection_reason: null,
        kyc_wizard_draft: null,
      })
      .eq('id', tenantId);
    if (profileError) throw profileError;

    await client.from('kyc_verifications').upsert(
      [
        {
          profile_id: tenantId,
          status: 'PENDING',
          submitted_at: now,
          rejection_reason: null,
          metadata: verificationMetadata,
          updated_at: now,
        },
      ],
      { onConflict: 'profile_id' },
    );

    await client.from('kyc_audit_log').insert([
      {
        user_id: tenantId,
        actor_id: tenantId,
        action: beforeProfile?.kyc_status === 'REJECTED' ? 'KYC_RESUBMITTED' : 'KYC_SUBMITTED',
        previous_status: beforeProfile?.kyc_status ?? null,
        next_status: 'PENDING_REVIEW',
        metadata: verificationMetadata,
      },
    ]);

    this.logger.log(`KYC wizard submitted for ${tenantId} (location match: ${locationCheck.match})`);

    return {
      status: 'PENDING_REVIEW',
      location_mismatch: !locationCheck.match && locationCheck.compared,
      location_match_score: locationCheck.score,
      submitted_at: now,
      documents: uploaded,
    };
  }

  private validatePersonal(p: KycPersonalInput) {
    if (!p.first_name?.trim() || !p.surname?.trim()) {
      throw new BadRequestException('First name and surname are required.');
    }
    if (!p.date_of_birth) throw new BadRequestException('Date of birth is required.');
    if (!p.gender?.trim()) throw new BadRequestException('Gender is required.');
    if (!p.nationality?.trim()) throw new BadRequestException('Nationality is required.');
    if (!p.phone?.trim()) throw new BadRequestException('Phone number is required.');
  }

  private validateResidence(r: KycResidenceInput) {
    if (!r.country?.trim() || !r.region?.trim() || !r.city?.trim() || !r.street_address?.trim()) {
      throw new BadRequestException('Country, region, city, and street address are required.');
    }
    if (!r.residential_status?.trim()) {
      throw new BadRequestException('Residential status is required.');
    }
  }

  private async storeDocuments(tenantId: string, documents: KycDocumentPayload['documents']) {
    const client = this.supabase.getClient();
    const now = new Date().toISOString();
    const uploaded = [];

    for (const document of documents) {
      const buffer = Buffer.from(document.data.fileBase64, 'base64');
      if (buffer.length > MAX_KYC_UPLOAD_BYTES) {
        throw new BadRequestException(`File exceeds maximum size of ${MAX_KYC_UPLOAD_BYTES} bytes`);
      }
      const safeName = sanitizeStorageFileName(document.data.filename);
      const path = `${tenantId}/${document.type}-${Date.now()}-${safeName}`;
      const res = await client.storage.from(KYC_BUCKET).upload(path, buffer, { upsert: false });
      if (res.error) throw res.error;

      const signedUrl = await createSignedStorageUrl(client, KYC_BUCKET, path);
      const row: Record<string, unknown> = {
        user_id: tenantId,
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

    return uploaded;
  }

  /** @deprecated Use submitWizard — kept for backward compatibility */
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
      documents: [{ type: payload.doc_type, data: { filename: payload.filename, fileBase64: payload.fileBase64 } }],
    });
  }

  async submitDocuments(payload: KycDocumentPayload) {
    const uploaded = await this.storeDocuments(payload.tenantId, payload.documents);
    const now = new Date().toISOString();
    const client = this.supabase.getClient();
    const { data: beforeProfile } = await client.from('profiles').select('kyc_status').eq('id', payload.tenantId).maybeSingle();

    await this.evaluateQualityFlags(payload.tenantId, uploaded);

    const { error: profileError } = await client
      .from('profiles')
      .update({ kyc_status: 'PENDING_REVIEW', kyc_submitted_at: now, kyc_rejection_reason: null })
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
        next_status: 'PENDING_REVIEW',
        metadata: { documents_uploaded: uploaded.length, types: uploaded.map((d) => d.type) },
      },
    ]);

    return { status: 'PENDING_REVIEW', submitted_at: now, documents: uploaded };
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
    const latestByApiType = new Map<string, (typeof documents)[0] & { api_type: string }>();
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
        'id, full_name, first_name, surname, national_id_number, phone, date_of_birth, gender, nationality, role, kyc_status, kyc_rejection_reason, kyc_submitted_at, kyc_approved_at, account_flagged, account_flag_note, address_street, address_region, address_city, address_postcode, address_country, residential_status, kyc_wizard_draft',
      )
      .eq('id', tenantId)
      .single();

    if (error) throw error;

    const email = await this.getTenantEmail(tenantId);

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

    const metadata = (verification?.metadata as Record<string, unknown>) || {};
    const rejectedDocTypes = (metadata.rejected_doc_types as KycDocumentType[]) ?? [];

    const { data: flags } = await client
      .from('kyc_flags')
      .select('flag_type, flag_note, flagged_at, dismissed_at')
      .eq('user_id', tenantId)
      .is('dismissed_at', null);

    const locationMismatch = (flags || []).some((f) => f.flag_type === 'LOCATION_MISMATCH');

    const documents = (await this.summarizeDocuments(client, docsData)).map((doc) => ({
      ...doc,
      needs_reupload:
        doc.needs_reupload ||
        (profile.kyc_status === 'REJECTED' &&
          rejectedDocTypes.includes(doc.type as KycDocumentType)),
    }));

    const tenantResidence: ResidenceInput = {
      country: profile.address_country || undefined,
      region: profile.address_region || undefined,
      city: profile.address_city || undefined,
      street_address: profile.address_street || undefined,
      postal_code: profile.address_postcode || undefined,
      residential_status: profile.residential_status || undefined,
    };

    return {
      profile: { ...profile, email },
      verification: verification || null,
      rejected_doc_types: rejectedDocTypes,
      documents,
      location_mismatch: locationMismatch || metadata.location_mismatch === true,
      wizard_draft: profile.kyc_wizard_draft,
    };
  }

  async getAdminLocationComparison(tenantId: string) {
    const client = this.supabase.getClient();
    const { data: profile } = await client
      .from('profiles')
      .select(
        'address_street, address_region, address_city, address_postcode, address_country, residential_status',
      )
      .eq('id', tenantId)
      .maybeSingle();

    const tenantResidence: ResidenceInput = {
      country: profile?.address_country || undefined,
      region: profile?.address_region || undefined,
      city: profile?.address_city || undefined,
      street_address: profile?.address_street || undefined,
      postal_code: profile?.address_postcode || undefined,
      residential_status: profile?.residential_status || undefined,
    };

    const landlordReference = await this.resolveLandlordReferenceForTenant(tenantId);
    const landlordResidence = landlordReference?.residence ?? null;
    const check = compareResidence(tenantResidence, landlordResidence);

    const { data: verification } = await client
      .from('kyc_verifications')
      .select('metadata')
      .eq('profile_id', tenantId)
      .maybeSingle();

    const meta = (verification?.metadata as Record<string, unknown>) || {};

    return {
      tenant: tenantResidence,
      landlord: landlordResidence,
      landlord_reference_source: landlordReference?.source ?? null,
      landlord_reference_label: landlordReference?.label ?? null,
      lease_tenant_residence: meta.tenant_residence ?? null,
      match: check.match,
      score: check.score,
      compared: check.compared,
      stored_metadata: verification?.metadata || null,
    };
  }
}
