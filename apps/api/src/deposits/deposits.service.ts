import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DepositsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  getEscrowStatus(): string {
    return 'Deposits module is configured.';
  }

  private getClient() {
    return this.supabaseService.getClient();
  }

  async fileDispute(
    tenantId: string,
    { depositId, reason, description, requestedAmount }: { depositId: string; reason: string; description: string; requestedAmount: number },
    evidenceFiles: any[] = [],
  ) {
    const client = this.getClient();
    const { data: deposit, error: depositError } = await client.from('deposits').select('*').eq('id', depositId).single();
    if (depositError || !deposit) {
      throw new NotFoundException('Deposit not found');
    }
    if (deposit.tenant_id !== tenantId) {
      throw new BadRequestException('Only the tenant may file a dispute for this deposit');
    }

    const { data: disputeData, error: disputeError } = await client.from('disputes').insert([
      {
        deposit_id: depositId,
        raised_by: tenantId,
        claim_description: `${reason}: ${description}`,
        status: 'OPEN',
        opened_at: new Date().toISOString(),
      },
    ]).select().limit(1);

    if (disputeError || !disputeData || disputeData.length === 0) {
      throw disputeError || new Error('Failed to create dispute');
    }

    const dispute = disputeData[0];
    if (evidenceFiles.length) {
      const evidenceRecords = evidenceFiles.map((file) => ({
        dispute_id: dispute.id,
        uploaded_by: tenantId,
        storage_path: file.path || `disputes/${dispute.id}/${file.originalname || file.filename || 'evidence'}`,
        file_name: file.originalname || file.filename || 'evidence',
        description: file.description || null,
        uploaded_at: new Date().toISOString(),
      }));
      await client.from('dispute_evidence').insert(evidenceRecords);
    }

    return dispute;
  }

  async getDispute(userId: string, disputeId: string) {
    const client = this.getClient();
    const { data: dispute, error: disputeError } = await client.from('disputes').select('*').eq('id', disputeId).single();
    if (disputeError || !dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const { data: deposit, error: depositError } = await client.from('deposits').select('*').eq('id', dispute.deposit_id).single();
    if (depositError || !deposit) {
      throw new NotFoundException('Deposit not found');
    }

    const { data: evidence } = await client.from('dispute_evidence').select('*').eq('dispute_id', disputeId);

    if (dispute.raised_by !== userId && deposit.tenant_id !== userId && deposit.landlord_id !== userId) {
      throw new BadRequestException('Not authorized to view this dispute');
    }

    return { ...dispute, evidence: evidence || [] };
  }

  async landlordRespond(
    landlordUserId: string,
    disputeId: string,
    response: 'accept_full' | 'accept_partial' | 'reject',
    proposedAmount?: number,
    reason?: string,
    evidenceFiles: any[] = [],
  ) {
    const client = this.getClient();

    const { data: landlordProfile, error: landlordError } = await client.from('landlord_profiles').select('id').eq('user_id', landlordUserId).single();
    if (landlordError || !landlordProfile) {
      throw new NotFoundException('Landlord profile not found');
    }

    const { data: dispute, error: disputeError } = await client.from('disputes').select('*').eq('id', disputeId).single();
    if (disputeError || !dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const { data: deposit, error: depositError } = await client.from('deposits').select('*').eq('id', dispute.deposit_id).single();
    if (depositError || !deposit) {
      throw new NotFoundException('Deposit not found');
    }
    if (deposit.landlord_id !== landlordProfile.id) {
      throw new BadRequestException('Only the landlord on record may respond to this dispute');
    }

    const update = {
      status: 'UNDER_REVIEW',
      resolution_notes: `${response} - ${reason || 'No reason provided'}${proposedAmount ? ` (proposed ${proposedAmount})` : ''}`,
      resolved_by: landlordProfile.id,
      resolved_at: new Date().toISOString(),
    };

    const { data: updatedDisputes, error: updateError } = await client.from('disputes').update(update).eq('id', disputeId).select().limit(1);
    if (updateError || !updatedDisputes || updatedDisputes.length === 0) {
      throw updateError || new Error('Failed to update dispute');
    }

    if (evidenceFiles.length) {
      const evidenceRecords = evidenceFiles.map((file) => ({
        dispute_id: disputeId,
        uploaded_by: landlordProfile.id,
        storage_path: file.path || `disputes/${disputeId}/${file.originalname || file.filename || 'evidence'}`,
        file_name: file.originalname || file.filename || 'evidence',
        description: file.description || null,
        uploaded_at: new Date().toISOString(),
      }));
      await client.from('dispute_evidence').insert(evidenceRecords);
    }

    return { dispute_id: disputeId, status: 'UNDER_REVIEW', response, proposedAmount, reason };
  }

  async tenantAcceptSettlement(tenantId: string, disputeId: string, accept: boolean) {
    const client = this.getClient();
    const { data: dispute, error: disputeError } = await client.from('disputes').select('*').eq('id', disputeId).single();
    if (disputeError || !dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const { data: deposit, error: depositError } = await client.from('deposits').select('*').eq('id', dispute.deposit_id).single();
    if (depositError || !deposit) {
      throw new NotFoundException('Deposit not found');
    }

    if (deposit.tenant_id !== tenantId) {
      throw new BadRequestException('Only the tenant may accept a settlement for this dispute');
    }

    const status = accept ? 'CLOSED' : 'OPEN';
    const { data: updatedDisputes, error: updateError } = await client.from('disputes').update({ status, resolved_at: accept ? new Date().toISOString() : null }).eq('id', disputeId).select().limit(1);
    if (updateError || !updatedDisputes || updatedDisputes.length === 0) {
      throw updateError || new Error('Failed to update dispute settlement');
    }

    return { dispute_id: disputeId, status, accepted: accept };
  }

  async listPendingAdminDisputes() {
    const client = this.getClient();
    const { data, error } = await client.from('disputes').select('*').in('status', ['OPEN', 'UNDER_REVIEW']);
    if (error) {
      throw error;
    }
    return data;
  }

  async adminArbitrate(
    adminId: string,
    disputeId: string,
    decision: 'tenant_wins' | 'landlord_wins' | 'split',
    amountToTenant: number,
    reason: string,
  ) {
    const client = this.getClient();
    const { data: dispute, error: disputeError } = await client.from('disputes').select('*').eq('id', disputeId).single();
    if (disputeError || !dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const { data: deposit, error: depositError } = await client.from('deposits').select('*').eq('id', dispute.deposit_id).single();
    if (depositError || !deposit) {
      throw new NotFoundException('Deposit not found');
    }

    const status = decision === 'tenant_wins' ? 'RESOLVED_TENANT' : decision === 'landlord_wins' ? 'RESOLVED_LANDLORD' : 'CLOSED';
    const resolutionNotes = `Admin decision: ${decision}. ${reason}. Amount to tenant: ${amountToTenant}`;

    const { data: updatedDisputes, error: updateError } = await client.from('disputes').update({
      status,
      resolution_notes: resolutionNotes,
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
    }).eq('id', disputeId).select().limit(1);

    if (updateError || !updatedDisputes || updatedDisputes.length === 0) {
      throw updateError || new Error('Failed to arbitrate dispute');
    }

    if (amountToTenant > 0 && status !== 'RESOLVED_LANDLORD') {
      await client.from('deposits').update({ status: 'REFUND_PENDING' }).eq('id', deposit.id);
    }

    return { dispute_id: disputeId, status, decision, amount_to_tenant: amountToTenant };
  }
}
