import { BadRequestException, Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { KycService } from './kyc.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserFromAuthHeader, getUserProfileFromAuthHeader } from '../supabase/supabase.utils';

type KycDocument = {
  type: 'government_id' | 'selfie' | 'income_proof' | 'address_proof';
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

  @Post('submit')
  async submit(
    @Headers('authorization') authHeader: string,
    @Body()
    body: {
      government_id: { filename: string; fileBase64: string };
      selfie: { filename: string; fileBase64: string };
      income_proof: { filename: string; fileBase64: string };
      address_proof: { filename: string; fileBase64: string };
    },
  ) {
    const { user } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    const documents: KycDocument[] = [
      { type: 'government_id', data: body.government_id },
      { type: 'selfie', data: body.selfie },
      { type: 'income_proof', data: body.income_proof },
      { type: 'address_proof', data: body.address_proof },
    ];

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
    body: {
      government_id: { filename: string; fileBase64: string };
      selfie: { filename: string; fileBase64: string };
      income_proof: { filename: string; fileBase64: string };
      address_proof: { filename: string; fileBase64: string };
    },
  ) {
    const { user } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    const documents: KycDocument[] = [
      { type: 'government_id', data: body.government_id },
      { type: 'selfie', data: body.selfie },
      { type: 'income_proof', data: body.income_proof },
      { type: 'address_proof', data: body.address_proof },
    ];

    for (const doc of documents) {
      if (!doc.data?.filename || !doc.data?.fileBase64) {
        throw new BadRequestException(`Missing file data for ${doc.type}`);
      }
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
      doc_type?: KycDocument['type'];
    },
  ) {
    const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
    if (!body.tenantId || !body.filename || !body.fileBase64) {
      throw new BadRequestException('tenantId, filename and fileBase64 are required');
    }
    if (body.tenantId !== user.id) {
      throw new UnauthorizedException('Tenant mismatch');
    }
    const allowed: KycDocument['type'][] = ['government_id', 'selfie', 'income_proof', 'address_proof'];
    if (body.doc_type && !allowed.includes(body.doc_type)) {
      throw new BadRequestException(`doc_type must be one of: ${allowed.join(', ')}`);
    }
    const res = await this.kycService.uploadDocument(body);
    return { success: true, data: res, error: null };
  }
}
