import { Controller, Post, Get, Delete, Param, Query, UseInterceptors, UploadedFile, Body, Headers, ForbiddenException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttachmentsService } from './attachments.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserProfileFromAuthHeader, assertRole } from '../supabase/supabase.utils';

@Controller('landlords/:landlordId/attachments')
export class AttachmentsController {
  constructor(
    private attachmentsService: AttachmentsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Param('landlordId') landlordId: string,
    @UploadedFile() file: any,
    @Body() body: any,
    @Headers('authorization') authHeader: string,
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    if (profile.id !== landlordId) {
      throw new ForbiddenException('Invalid landlord credentials');
    }

    const { property_id, attachment_type, description } = body;

    const result = await this.attachmentsService.uploadAttachment(
      profile,
      property_id || null,
      file,
      attachment_type,
      description,
    );

    return { success: true, data: result };
  }

  @Get()
  async listAttachments(
    @Param('landlordId') landlordId: string,
    @Headers('authorization') authHeader: string,
    @Query('status') status?: string,
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    if (profile.id !== landlordId) {
      throw new ForbiddenException('Invalid landlord credentials');
    }
    const data = await this.attachmentsService.listAttachments(landlordId, status);
    return { success: true, data };
  }

  @Get(':attachmentId/url')
  async getAttachmentUrl(
    @Param('landlordId') landlordId: string,
    @Param('attachmentId') attachmentId: string,
    @Headers('authorization') authHeader: string,
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    if (profile.id !== landlordId) {
      throw new ForbiddenException('Invalid landlord credentials');
    }
    const data = await this.attachmentsService.getAttachmentUrl(landlordId, attachmentId);
    return { success: true, data };
  }

  @Delete(':attachmentId')
  async deleteAttachment(
    @Param('landlordId') landlordId: string,
    @Param('attachmentId') attachmentId: string,
    @Headers('authorization') authHeader: string,
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    if (profile.id !== landlordId) {
      throw new ForbiddenException('Invalid landlord credentials');
    }
    const result = await this.attachmentsService.deleteAttachment(landlordId, attachmentId);
    return result;
  }

  @Post('request-service')
  async createServiceRequest(
    @Param('landlordId') landlordId: string,
    @Body() body: any,
    @Headers('authorization') authHeader: string,
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    if (profile.id !== landlordId) {
      throw new ForbiddenException('Invalid landlord credentials');
    }
    const { property_id, request_type, description, fee_amount } = body;

    const result = await this.attachmentsService.createServiceRequest(
      landlordId,
      property_id || null,
      request_type,
      description,
      fee_amount,
    );

    return { success: true, data: result };
  }

  @Get('requests')
  async listServiceRequests(
    @Param('landlordId') landlordId: string,
    @Headers('authorization') authHeader: string,
    @Query('status') status?: string,
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    if (profile.id !== landlordId) {
      throw new ForbiddenException('Invalid landlord credentials');
    }
    const data = await this.attachmentsService.listServiceRequests(landlordId, status);
    return { success: true, data };
  }

  @Post('requests/:requestId/cancel')
  async cancelServiceRequest(
    @Param('landlordId') landlordId: string,
    @Param('requestId') requestId: string,
    @Headers('authorization') authHeader: string,
  ) {
    const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader);
    assertRole(profile, 'LANDLORD');
    if (profile.id !== landlordId) {
      throw new ForbiddenException('Invalid landlord credentials');
    }
    const result = await this.attachmentsService.cancelServiceRequest(landlordId, requestId);
    return result;
  }
}
