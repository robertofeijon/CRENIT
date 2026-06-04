import { BadRequestException, Body, Controller, Get, Headers, Post, Put, UnauthorizedException } from '@nestjs/common';
import {
  KycService,
  REQUIRED_KYC_DOCUMENT_TYPES,
  type KycDocumentType,
  type KycPersonalInput,
  type KycResidenceInput,
} from './kyc.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserFromAuthHeader, getUserProfileFromAuthHeader } from '../supabase/supabase.utils';

type KycDocument = {
  type: KycDocumentType;
  data: { filename: string; fileBase64: string };
};

@Controller('kyc')
export class KycController {
  constructor(
    private readonly kycService: KycService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('health')
  health() {
    return { success: true, data: { module: 'kyc' }, error: null };
  }

  @Get('status')
  async status(@Headers('authorization') authHeader: string) {
    const { user } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    const result = await this.kycService.getStatus(user.id);
    return { success: true, data: result, error: null };
  }

  @Put('identity')
  async updateIdentity(
    @Headers('authorization') authHeader: string,
    @Body() body: { national_id_number?: string; first_name?: string; surname?: string },
  ) {
    const { user } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    const result = await this.kycService.updateTenantIdentity(user.id, body);
    return { success: true, data: result, error: null };
  }

  @Put('wizard/personal')
  async savePersonalDraft(
    @Headers('authorization') authHeader: string,
    @Body() body: Partial<KycPersonalInput>,
  ) {
    const { user } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    const result = await this.kycService.saveWizardDraft(user.id, 1, { personal: body });
    return { success: true, data: result, error: null };
  }

  @Put('wizard/residence')
  async saveResidenceDraft(
    @Headers('authorization') authHeader: string,
    @Body() body: Partial<KycResidenceInput>,
  ) {
    const { user } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    const result = await this.kycService.saveWizardDraft(user.id, 2, { residence: body });
    return { success: true, data: result, error: null };
  }

  @Post('wizard/submit')
  async submitWizard(
    @Headers('authorization') authHeader: string,
    @Body()
    body: {
      personal: KycPersonalInput;
      residence: KycResidenceInput;
      documents: Record<KycDocumentType, { filename: string; fileBase64: string }>;
      market_data_consent?: boolean;
    },
  ) {
    const { user } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    if (!body.personal || !body.residence || !body.documents) {
      throw new BadRequestException('personal, residence, and documents are required');
    }
    for (const type of REQUIRED_KYC_DOCUMENT_TYPES) {
      if (!body.documents[type]?.filename || !body.documents[type]?.fileBase64) {
        throw new BadRequestException(`Missing file data for ${type}`);
      }
    }
    const result = await this.kycService.submitWizard(user.id, body);
    return { success: true, data: result, error: null };
  }

  @Post('submit')
  async submit(
    @Headers('authorization') authHeader: string,
    @Body()
    body: Record<KycDocumentType, { filename: string; fileBase64: string }>,
  ) {
    const { user } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    const documents: KycDocument[] = REQUIRED_KYC_DOCUMENT_TYPES.map((type) => ({
      type,
      data: body[type],
    }));

    for (const doc of documents) {
      if (!doc.data?.filename || !doc.data?.fileBase64) {
        throw new BadRequestException(`Missing file data for ${doc.type}`);
      }
    }

    const result = await this.kycService.submitDocuments({ tenantId: user.id, documents });
    return { success: true, data: result, error: null };
  }

  @Post('resubmit')
  async resubmit(
    @Headers('authorization') authHeader: string,
    @Body()
    body: Partial<Record<KycDocumentType, { filename: string; fileBase64: string }>>,
  ) {
    const { user } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    const documents: KycDocument[] = REQUIRED_KYC_DOCUMENT_TYPES.filter((type) => body[type]?.fileBase64).map((type) => ({
      type,
      data: body[type]!,
    }));

    if (!documents.length) {
      throw new BadRequestException('At least one document is required for resubmission');
    }

    const result = await this.kycService.resubmitDocuments({ tenantId: user.id, documents });
    return { success: true, data: result, error: null };
  }

  @Post('upload')
  async upload(
    @Headers('authorization') authHeader: string,
    @Body()
    body: {
      tenantId: string;
      filename: string;
      fileBase64: string;
      doc_type?: KycDocumentType;
    },
  ) {
    const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
    if (!body.tenantId || !body.filename || !body.fileBase64 || !body.doc_type) {
      throw new BadRequestException('tenantId, doc_type, filename and fileBase64 are required');
    }
    if (body.tenantId !== user.id) {
      throw new UnauthorizedException('Tenant mismatch');
    }
    if (!REQUIRED_KYC_DOCUMENT_TYPES.includes(body.doc_type)) {
      throw new BadRequestException(`doc_type must be one of: ${REQUIRED_KYC_DOCUMENT_TYPES.join(', ')}`);
    }
    const res = await this.kycService.uploadDocument({
      tenantId: body.tenantId,
      filename: body.filename,
      fileBase64: body.fileBase64,
      doc_type: body.doc_type,
    });
    return { success: true, data: res, error: null };
  }
}
