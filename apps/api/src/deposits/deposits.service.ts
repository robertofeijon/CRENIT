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

  private async getLandlordProfileId(landlordUserId: string) {
    const client = this.getClient();
    const { data, error } = await client.from('landlord_profiles').select('id').eq('user_id', landlordUserId).single();
    if (error || !data) {
      throw new NotFoundException('Landlord profile not found');
    }
    return data.id;
  }

  async getTenantDeposit(tenantId: string) {
    const client = this.getClient();
    const { data, error } = await client
      .from('deposits')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { ...data, timeline: this.buildDepositTimeline(data) };
  }

  async listLandlordDeposits(landlordUserId: string) {
    const client = this.getClient();
    const landlordId = await this.getLandlordProfileId(landlordUserId);
    const { data, error } = await client.from('deposits').select('*').eq('landlord_id', landlordId).order('created_at', { ascending: false });
    if (error) throw error;

    const deposits = data || [];
    const tenantIds = Array.from(new Set(deposits.map((d: any) => d.tenant_id).filter(Boolean)));
    const { data: profiles } = tenantIds.length
      ? await client.from('profiles').select('id, full_name').in('id', tenantIds)
      : { data: [] };
    const nameById = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));

    return deposits.map((deposit: any) => ({
      ...deposit,
      tenant_name: nameById.get(deposit.tenant_id) || 'Unknown',
      timeline: this.buildDepositTimeline(deposit),
    }));
  }

  async collectDeposit(landlordUserId: string, payload: { lease_id: string; amount: number }) {
    const client = this.getClient();
    const landlordId = await this.getLandlordProfileId(landlordUserId);

    const { data: lease, error: leaseError } = await client.from('leases').select('*').eq('id', payload.lease_id).single();
    if (leaseError || !lease) {
      throw new NotFoundException('Lease not found');
    }
    if (lease.landlord_id !== landlordId) {
      throw new BadRequestException('Lease does not belong to this landlord');
    }
    if (!payload.amount || payload.amount <= 0) {
      throw new BadRequestException('amount must be greater than zero');
    }

    const commissionRate = 0.005;
    const commissionAmount = Number((payload.amount * commissionRate).toFixed(2));
    const now = new Date().toISOString();

    const { data: rows, error } = await client
      .from('deposits')
      .insert([
        {
          lease_id: lease.id,
          tenant_id: lease.tenant_id,
          landlord_id: landlordId,
          amount: payload.amount,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          status: 'HELD',
          collected_date: now,
          is_simulated: true,
          sim_escrow_id: `ESC-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        },
      ])
      .select()
      .limit(1);

    if (error || !rows?.[0]) {
      throw error || new BadRequestException('Failed to collect deposit');
    }

    return { ...rows[0], timeline: this.buildDepositTimeline(rows[0]) };
  }

  async requestRefund(landlordUserId: string, depositId: string) {
    const client = this.getClient();
    const landlordId = await this.getLandlordProfileId(landlordUserId);
    const deposit = await this.getDepositForLandlord(landlordId, depositId);

    if (deposit.status !== 'HELD') {
      throw new BadRequestException('Only held deposits can be marked for refund');
    }

    const now = new Date().toISOString();
    const { data, error } = await client
      .from('deposits')
      .update({ status: 'REFUND_PENDING', refund_requested_at: now })
      .eq('id', depositId)
      .select()
      .single();

    if (error) throw error;
    return { ...data, timeline: this.buildDepositTimeline(data) };
  }

  async releaseDeposit(landlordUserId: string, depositId: string) {
    const client = this.getClient();
    const landlordId = await this.getLandlordProfileId(landlordUserId);
    const deposit = await this.getDepositForLandlord(landlordId, depositId);

    if (!['HELD', 'REFUND_PENDING'].includes(deposit.status)) {
      throw new BadRequestException('Deposit cannot be released in its current status');
    }

    const now = new Date().toISOString();
    const { data, error } = await client
      .from('deposits')
      .update({ status: 'REFUNDED', refund_completed_at: now })
      .eq('id', depositId)
      .select()
      .single();

    if (error) throw error;
    return { ...data, timeline: this.buildDepositTimeline(data) };
  }

  async getDepositById(userId: string, depositId: string, role: string) {
    const client = this.getClient();
    const { data: deposit, error } = await client.from('deposits').select('*').eq('id', depositId).single();
    if (error || !deposit) {
      throw new NotFoundException('Deposit not found');
    }

    if (role === 'TENANT' && deposit.tenant_id !== userId) {
      throw new BadRequestException('Not authorized to view this deposit');
    }

    if (role === 'LANDLORD') {
      const landlordId = await this.getLandlordProfileId(userId);
      if (deposit.landlord_id !== landlordId) {
        throw new BadRequestException('Not authorized to view this deposit');
      }
    }

    const { data: disputes } = await client.from('disputes').select('*').eq('deposit_id', depositId).order('opened_at', { ascending: false });

    return {
      ...deposit,
      disputes: disputes || [],
      timeline: this.buildDepositTimeline(deposit, disputes || []),
    };
  }

  private async getDepositForLandlord(landlordId: string, depositId: string) {
    const client = this.getClient();
    const { data, error } = await client.from('deposits').select('*').eq('id', depositId).eq('landlord_id', landlordId).single();
    if (error || !data) {
      throw new NotFoundException('Deposit not found');
    }
    return data;
  }

  private buildDepositTimeline(deposit: any, disputes: any[] = []) {
    const events: { type: string; label: string; at: string }[] = [];

    if (deposit.collected_date) {
      events.push({ type: 'collected', label: 'Deposit collected into escrow', at: deposit.collected_date });
    }
    if (deposit.refund_requested_at) {
      events.push({ type: 'refund_requested', label: 'Refund requested', at: deposit.refund_requested_at });
    }
    if (deposit.refund_completed_at) {
      events.push({ type: 'refunded', label: 'Refund completed', at: deposit.refund_completed_at });
    }
    if (deposit.status === 'DISPUTED') {
      events.push({ type: 'disputed', label: 'Deposit disputed', at: deposit.created_at });
    }

    for (const dispute of disputes) {
      events.push({
        type: 'dispute',
        label: `Dispute ${dispute.status}: ${dispute.claim_description?.slice(0, 80) || 'No description'}`,
        at: dispute.opened_at || dispute.created_at,
      });
    }

    return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
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
