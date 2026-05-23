import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface Attachment {
  id: string;
  landlord_id: string;
  property_id?: string;
  attachment_type: 'PROPERTY_PROOF' | 'LEASE_AGREEMENT' | 'OWNERSHIP_DOCUMENT' | 'OTHER';
  file_name: string;
  storage_path: string;
  description?: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejection_reason?: string;
  uploaded_at: string;
}

export interface AttachmentRequest {
  id: string;
  landlord_id: string;
  property_id?: string;
  request_type: 'UPLOAD_DOCUMENTS' | 'VERIFY_DOCUMENTS' | 'FULL_ONBOARDING';
  description?: string;
  fee_amount: number;
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  assigned_admin_id?: string;
  created_at: string;
}

@Injectable()
export class AttachmentsService {
  constructor(private supabaseService: SupabaseService) {}

  async uploadAttachment(
    landlordProfile: any,
    propertyId: string | null,
    file: any,
    attachmentType: string,
    description?: string,
  ): Promise<Attachment> {
    const client = this.supabaseService.getClient();

    if (!file) throw new BadRequestException('No file provided');
    if (!['PROPERTY_PROOF', 'LEASE_AGREEMENT', 'OWNERSHIP_DOCUMENT', 'OTHER'].includes(attachmentType)) {
      throw new BadRequestException('Invalid attachment type');
    }

    // Verify property access
    if (propertyId) {
      const { data: property, error: propError } = await client
        .from('properties')
        .select('id')
        .eq('id', propertyId)
        .eq('landlord_id', landlordProfile.id)
        .single();

      if (propError || !property) {
        throw new ForbiddenException('Property not found or not owned by landlord');
      }
    }

    // Upload to Supabase Storage
    const fileName = `${landlordProfile.id}/${Date.now()}-${file.originalname}`;
    const { error: uploadError } = await client.storage
      .from('landlord-attachments')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
      });

    if (uploadError) throw new BadRequestException(`Upload failed: ${uploadError.message}`);

    // Create attachment record
    const { data, error } = await client
      .from('attachments')
      .insert({
        landlord_id: landlordProfile.id,
        property_id: propertyId,
        attachment_type: attachmentType,
        file_name: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
        storage_path: fileName,
        description,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to create attachment record: ${error.message}`);
    return data;
  }

  async listAttachments(landlordId: string, status?: string) {
    const client = this.supabaseService.getClient();

    let query = client
      .from('attachments')
      .select('*')
      .eq('landlord_id', landlordId)
      .order('uploaded_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw new BadRequestException(`Failed to fetch attachments: ${error.message}`);
    return data || [];
  }

  async deleteAttachment(landlordId: string, attachmentId: string) {
    const client = this.supabaseService.getClient();

    const { data: attachment, error: fetchError } = await client
      .from('attachments')
      .select('storage_path, landlord_id')
      .eq('id', attachmentId)
      .single();

    if (fetchError || !attachment) throw new NotFoundException('Attachment not found');
    if (attachment.landlord_id !== landlordId) throw new ForbiddenException('Cannot delete attachment');

    // Delete from storage
    await client.storage.from('landlord-attachments').remove([attachment.storage_path]);

    // Delete record
    const { error: deleteError } = await client.from('attachments').delete().eq('id', attachmentId);

    if (deleteError) throw new BadRequestException(`Failed to delete attachment: ${deleteError.message}`);
    return { success: true, message: 'Attachment deleted' };
  }

  async getAttachmentUrl(landlordId: string, attachmentId: string) {
    const client = this.supabaseService.getClient();

    const { data: attachment, error } = await client
      .from('attachments')
      .select('storage_path, landlord_id')
      .eq('id', attachmentId)
      .single();

    if (error || !attachment) throw new NotFoundException('Attachment not found');
    if (attachment.landlord_id !== landlordId) throw new ForbiddenException('Cannot access attachment');

    const { data } = client.storage.from('landlord-attachments').getPublicUrl(attachment.storage_path);
    return { url: data.publicUrl };
  }

  // Service request methods
  async createServiceRequest(
    landlordId: string,
    propertyId: string | null,
    requestType: string,
    description?: string,
    feeAmount: number = 0,
  ): Promise<AttachmentRequest> {
    const client = this.supabaseService.getClient();

    if (!['UPLOAD_DOCUMENTS', 'VERIFY_DOCUMENTS', 'FULL_ONBOARDING'].includes(requestType)) {
      throw new BadRequestException('Invalid request type');
    }

    const { data, error } = await client
      .from('attachment_requests')
      .insert({
        landlord_id: landlordId,
        property_id: propertyId,
        request_type: requestType,
        description,
        fee_amount: feeAmount,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to create request: ${error.message}`);
    return data;
  }

  async listServiceRequests(landlordId: string, status?: string) {
    const client = this.supabaseService.getClient();

    let query = client
      .from('attachment_requests')
      .select('*')
      .eq('landlord_id', landlordId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw new BadRequestException(`Failed to fetch requests: ${error.message}`);
    return data || [];
  }

  async cancelServiceRequest(landlordId: string, requestId: string) {
    const client = this.supabaseService.getClient();

    const { data: request, error: fetchError } = await client
      .from('attachment_requests')
      .select('landlord_id, status')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) throw new NotFoundException('Request not found');
    if (request.landlord_id !== landlordId) throw new ForbiddenException('Cannot cancel request');
    if (!['PENDING', 'ACCEPTED'].includes(request.status)) {
      throw new BadRequestException('Can only cancel pending or accepted requests');
    }

    const { error: updateError } = await client
      .from('attachment_requests')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (updateError) throw new BadRequestException(`Failed to cancel request: ${updateError.message}`);
    return { success: true, message: 'Request cancelled' };
  }

  // Admin methods
  async getPendingRequests() {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('attachment_requests')
      .select('*, profiles:landlord_id(full_name, email)')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true });

    if (error) throw new BadRequestException(`Failed to fetch pending requests: ${error.message}`);
    return data || [];
  }

  async assignRequest(requestId: string, adminId: string) {
    const client = this.supabaseService.getClient();

    const { error } = await client
      .from('attachment_requests')
      .update({
        assigned_admin_id: adminId,
        status: 'ACCEPTED',
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) throw new BadRequestException(`Failed to assign request: ${error.message}`);
    return { success: true, message: 'Request assigned' };
  }

  async completeRequest(requestId: string, notes?: any) {
    const client = this.supabaseService.getClient();

    const { error } = await client
      .from('attachment_requests')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) throw new BadRequestException(`Failed to complete request: ${error.message}`);
    return { success: true, message: 'Request completed' };
  }

  async verifyAttachment(attachmentId: string, adminId: string, approved: boolean, rejectionReason?: string) {
    const client = this.supabaseService.getClient();

    const update = approved
      ? {
          status: 'VERIFIED',
          verified_by: adminId,
          verified_at: new Date().toISOString(),
        }
      : {
          status: 'REJECTED',
          rejection_reason: rejectionReason,
          verified_by: adminId,
          verified_at: new Date().toISOString(),
        };

    const { error } = await client.from('attachments').update(update).eq('id', attachmentId);

    if (error) throw new BadRequestException(`Failed to verify attachment: ${error.message}`);
    return { success: true, status: approved ? 'VERIFIED' : 'REJECTED' };
  }
}
