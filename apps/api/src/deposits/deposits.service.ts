import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreditScoreService } from '../credit-score/credit-score.service';
import { DISPUTE_TEMPLATES, DISPUTE_TYPES, type DisputeType } from './dispute-templates';

function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added += 1;
  }
  return result;
}

const RESOLVED_STATUSES = new Set(['RESOLVED_TENANT', 'RESOLVED_LANDLORD', 'CLOSED']);

@Injectable()
export class DepositsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly creditScoreService: CreditScoreService,
  ) {}

  getEscrowStatus(): string {
    return 'Deposits module is configured.';
  }

  private getClient() {
    return this.supabaseService.getClient();
  }

  getDisputeTemplates() {
    return DISPUTE_TEMPLATES;
  }

  private async logDisputeEvent(
    disputeId: string,
    eventType: string,
    actorId: string | null,
    message: string,
    metadata: Record<string, unknown> = {},
  ) {
    const client = this.getClient();
    await client.from('dispute_events').insert([
      {
        dispute_id: disputeId,
        event_type: eventType,
        actor_id: actorId,
        message,
        metadata,
      },
    ]);
  }

  private async loadDisputeTimeline(disputeId: string) {
    const client = this.getClient();
    const { data } = await client
      .from('dispute_events')
      .select('event_type, message, metadata, created_at, actor_id')
      .eq('dispute_id', disputeId)
      .order('created_at', { ascending: true });
    return data || [];
  }

  private async ensureEscrowAccount(deposit: any) {
    const client = this.getClient();
    const { data: existing } = await client
      .from('escrow_accounts')
      .select('*')
      .eq('deposit_id', deposit.id)
      .maybeSingle();
    if (existing) return existing;

    const { data, error } = await client
      .from('escrow_accounts')
      .insert([
        {
          deposit_id: deposit.id,
          lease_id: deposit.lease_id,
          tenant_id: deposit.tenant_id,
          landlord_id: deposit.landlord_id,
          total_held: Number(deposit.amount || 0),
          status: 'HELD',
        },
      ])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  private async logEscrowTransaction(payload: {
    escrow_account_id: string;
    deposit_id: string;
    dispute_id?: string;
    transaction_type:
      | 'HOLD'
      | 'RELEASE_TO_TENANT'
      | 'RELEASE_TO_LANDLORD'
      | 'REFUND'
      | 'DISPUTE_OPENED'
      | 'DISPUTE_RESOLVED'
      | 'ADJUSTMENT';
    amount: number;
    status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    created_by?: string;
    notes?: string;
    metadata?: Record<string, any>;
  }) {
    const client = this.getClient();
    await client.from('escrow_transactions').insert([
      {
        escrow_account_id: payload.escrow_account_id,
        deposit_id: payload.deposit_id,
        dispute_id: payload.dispute_id || null,
        transaction_type: payload.transaction_type,
        amount: Number(payload.amount || 0),
        status: payload.status || 'COMPLETED',
        created_by: payload.created_by || null,
        notes: payload.notes || null,
        metadata: payload.metadata || {},
      },
    ]);
  }

  async fileDispute(
    tenantId: string,
    {
      depositId,
      reason,
      description,
      requestedAmount,
      disputeType,
    }: {
      depositId: string;
      reason: string;
      description: string;
      requestedAmount: number;
      disputeType?: DisputeType;
    },
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

    const type: DisputeType = disputeType && DISPUTE_TYPES.includes(disputeType) ? disputeType : 'OTHER';
    const template = DISPUTE_TEMPLATES[type];
    const { data: disputeData, error: disputeError } = await client.from('disputes').insert([
      {
        deposit_id: depositId,
        raised_by: tenantId,
        dispute_type: type,
        claim_description: `${reason}: ${description}`,
        status: 'OPEN',
        opened_at: new Date().toISOString(),
      },
    ]).select().limit(1);

    if (disputeError || !disputeData || disputeData.length === 0) {
      throw disputeError || new Error('Failed to create dispute');
    }

    const dispute = disputeData[0];
    await this.logDisputeEvent(
      dispute.id,
      'OPENED',
      tenantId,
      `Dispute opened: ${template.label}`,
      { dispute_type: type, eta_days: template.eta_days, requested_amount: requestedAmount },
    );
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

    const escrowAccount = await this.ensureEscrowAccount(deposit);
    await this.logEscrowTransaction({
      escrow_account_id: escrowAccount.id,
      deposit_id: deposit.id,
      dispute_id: dispute.id,
      transaction_type: 'DISPUTE_OPENED',
      amount: Number(requestedAmount || deposit.amount || 0),
      created_by: tenantId,
      notes: `Dispute opened: ${reason}`,
    });

    if (deposit.landlord_id) {
      const { data: landlordProfile } = await client.from('landlord_profiles').select('user_id').eq('id', deposit.landlord_id).maybeSingle();
      if (landlordProfile?.user_id) {
        await this.notificationsService.createNotification({
          user_id: landlordProfile.user_id,
          type: 'DISPUTE_FILED',
          title: 'A dispute has been filed',
          message: 'A tenant has filed a deposit dispute that requires your review.',
          metadata: { dispute_id: dispute.id, deposit_id: depositId },
        });
      }
    }
    return { ...dispute, template, estimated_resolution_days: template.eta_days };
  }

  async getDispute(userId: string, disputeId: string, role?: string) {
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

    const normalizedRole = (role || '').toUpperCase();
    let authorized =
      dispute.raised_by === userId ||
      deposit.tenant_id === userId ||
      normalizedRole === 'ADMIN';

    if (!authorized && normalizedRole === 'LANDLORD') {
      try {
        const landlordProfileId = await this.getLandlordProfileId(userId);
        authorized = deposit.landlord_id === landlordProfileId;
      } catch {
        authorized = false;
      }
    }

    if (!authorized) {
      throw new BadRequestException('Not authorized to view this dispute');
    }

    const timeline = await this.loadDisputeTimeline(disputeId);
    const disputeType = (dispute.dispute_type as DisputeType) || 'OTHER';
    const template = DISPUTE_TEMPLATES[disputeType] || DISPUTE_TEMPLATES.OTHER;
    const openedAt = new Date(dispute.opened_at || dispute.created_at || Date.now());
    const etaDate = new Date(openedAt.getTime() + template.eta_days * 86400000);

    return {
      ...dispute,
      evidence: evidence || [],
      timeline,
      template,
      next_step:
        dispute.status === 'OPEN'
          ? 'Landlord review'
          : dispute.status === 'UNDER_REVIEW'
            ? dispute.appeal_status === 'FILED'
              ? 'Senior review (appeal)'
              : 'Admin or settlement review'
            : dispute.appeal_status === 'OPEN' && this.canAppealDispute(dispute)
              ? 'Appeal window open'
              : 'Case closed',
      estimated_resolution_by: etaDate.toISOString(),
      can_appeal: this.canAppealDispute(dispute),
    };
  }

  private canAppealDispute(dispute: { status?: string; appeal_status?: string | null; appeal_deadline?: string | null }) {
    if (!dispute.status || !RESOLVED_STATUSES.has(dispute.status)) return false;
    if (dispute.appeal_status !== 'OPEN') return false;
    if (!dispute.appeal_deadline) return false;
    return new Date(dispute.appeal_deadline).getTime() > Date.now();
  }

  async fileDisputeAppeal(userId: string, disputeId: string, reason: string) {
    const trimmed = reason?.trim();
    if (!trimmed) {
      throw new BadRequestException('reason is required');
    }

    const client = this.getClient();
    const { data: dispute, error: disputeError } = await client.from('disputes').select('*').eq('id', disputeId).single();
    if (disputeError || !dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const { data: deposit, error: depositError } = await client.from('deposits').select('*').eq('id', dispute.deposit_id).single();
    if (depositError || !deposit) {
      throw new NotFoundException('Deposit not found');
    }

    let authorized = deposit.tenant_id === userId;
    if (!authorized) {
      try {
        const landlordProfileId = await this.getLandlordProfileId(userId);
        authorized = deposit.landlord_id === landlordProfileId;
      } catch {
        authorized = false;
      }
    }
    if (!authorized) {
      throw new UnauthorizedException('Not authorized to appeal this dispute');
    }
    if (!this.canAppealDispute(dispute)) {
      throw new BadRequestException('Appeal window is closed or unavailable');
    }

    const { error: updateError } = await client
      .from('disputes')
      .update({ status: 'UNDER_REVIEW', appeal_status: 'FILED' })
      .eq('id', disputeId);
    if (updateError) throw updateError;

    await this.logDisputeEvent(disputeId, 'APPEAL_FILED', userId, trimmed, {});

    return { dispute_id: disputeId, status: 'UNDER_REVIEW', appeal_status: 'FILED' };
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

    await this.logDisputeEvent(
      disputeId,
      'LANDLORD_RESPONDED',
      landlordUserId,
      `Landlord responded: ${response}`,
      { response, proposed_amount: proposedAmount, reason: reason || null },
    );

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
    const collected = rows[0];
    const escrowAccount = await this.ensureEscrowAccount(collected);
    await this.logEscrowTransaction({
      escrow_account_id: escrowAccount.id,
      deposit_id: collected.id,
      transaction_type: 'HOLD',
      amount: Number(collected.amount || 0),
      created_by: landlordUserId,
      notes: 'Deposit held in escrow',
    });
    return { ...collected, timeline: this.buildDepositTimeline(collected) };
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
    const escrowAccount = await this.ensureEscrowAccount(data);
    await client
      .from('escrow_accounts')
      .update({
        status: 'PARTIALLY_RELEASED',
        total_refunded: Number(data.amount || 0),
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrowAccount.id);
    await this.logEscrowTransaction({
      escrow_account_id: escrowAccount.id,
      deposit_id: data.id,
      transaction_type: 'REFUND',
      amount: Number(data.amount || 0),
      created_by: landlordUserId,
      notes: 'Refund requested by landlord',
    });
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
    const escrowAccount = await this.ensureEscrowAccount(data);
    await client
      .from('escrow_accounts')
      .update({
        status: 'RELEASED',
        total_released: Number(data.amount || 0),
        total_refunded: Number(data.amount || 0),
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrowAccount.id);
    await this.logEscrowTransaction({
      escrow_account_id: escrowAccount.id,
      deposit_id: data.id,
      transaction_type: 'RELEASE_TO_TENANT',
      amount: Number(data.amount || 0),
      created_by: landlordUserId,
      notes: 'Deposit released to tenant',
    });
    await this.notificationsService.createNotification({
      user_id: data.tenant_id,
      type: 'DEPOSIT_RELEASED',
      title: 'Deposit released',
      message: 'Your deposit refund has been released.',
      metadata: { deposit_id: data.id, amount: data.amount },
    });
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
    // ADMIN can view any deposit for operational arbitration.

    const { data: disputes } = await client.from('disputes').select('*').eq('deposit_id', depositId).order('opened_at', { ascending: false });

    return {
      ...deposit,
      disputes: disputes || [],
      timeline: this.buildDepositTimeline(deposit, disputes || []),
    };
  }

  async getEscrowLedger(userId: string, depositId: string, role: string) {
    const deposit = await this.getDepositById(userId, depositId, role);
    const client = this.getClient();
    const { data: account } = await client
      .from('escrow_accounts')
      .select('*')
      .eq('deposit_id', depositId)
      .maybeSingle();
    if (!account) {
      return { account: null, transactions: [] };
    }
    const { data: transactions, error } = await client
      .from('escrow_transactions')
      .select('*')
      .eq('escrow_account_id', account.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { account, transactions: transactions || [] };
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
    const resolvedAt = new Date();
    const appealDeadline = addBusinessDays(resolvedAt, 5);

    const { data: updatedDisputes, error: updateError } = await client.from('disputes').update({
      status,
      resolution_notes: resolutionNotes,
      resolved_by: adminId,
      resolved_at: resolvedAt.toISOString(),
      appeal_deadline: appealDeadline.toISOString(),
      appeal_status: 'OPEN',
    }).eq('id', disputeId).select().limit(1);

    if (updateError || !updatedDisputes || updatedDisputes.length === 0) {
      throw updateError || new Error('Failed to arbitrate dispute');
    }

    if (amountToTenant > 0 && status !== 'RESOLVED_LANDLORD') {
      await client.from('deposits').update({ status: 'REFUND_PENDING' }).eq('id', deposit.id);
    }

    const escrowAccount = await this.ensureEscrowAccount(deposit);
    await client
      .from('escrow_accounts')
      .update({
        status: status === 'RESOLVED_LANDLORD' ? 'CLOSED' : 'DISPUTED',
        total_disputed: Number(amountToTenant || 0),
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrowAccount.id);
    await this.logEscrowTransaction({
      escrow_account_id: escrowAccount.id,
      deposit_id: deposit.id,
      dispute_id: disputeId,
      transaction_type: 'DISPUTE_RESOLVED',
      amount: Number(amountToTenant || 0),
      created_by: adminId,
      notes: `Arbitration: ${decision}`,
      metadata: { decision, reason },
    });

    const { data: landlordProfile } = await client.from('landlord_profiles').select('user_id').eq('id', deposit.landlord_id).maybeSingle();
    if (deposit.tenant_id) {
      await this.notificationsService.createNotification({
        user_id: deposit.tenant_id,
        type: 'DISPUTE_RESOLVED',
        title: 'Dispute resolved',
        message: 'Your deposit dispute has been resolved.',
        metadata: { dispute_id: disputeId, decision, amount_to_tenant: amountToTenant },
      });
    }
    if (landlordProfile?.user_id) {
      await this.notificationsService.createNotification({
        user_id: landlordProfile.user_id,
        type: 'DISPUTE_RESOLVED',
        title: 'Dispute resolved',
        message: 'A deposit dispute has been resolved.',
        metadata: { dispute_id: disputeId, decision, amount_to_tenant: amountToTenant },
      });
    }

    const openedAt = new Date(dispute.opened_at || dispute.created_at || Date.now());
    const resolutionDays = Math.max(1, Math.ceil((resolvedAt.getTime() - openedAt.getTime()) / 86400000));
    const landlordFavoured = decision === 'landlord_wins' || (decision === 'split' && amountToTenant <= 0);

    await this.logDisputeEvent(
      disputeId,
      'ADMIN_ARBITRATED',
      adminId,
      `Admin decision: ${decision}`,
      { decision, amount_to_tenant: amountToTenant, reason },
    );

    await client.from('dispute_outcomes').insert([
      {
        dispute_id: disputeId,
        dispute_type: dispute.dispute_type || 'OTHER',
        outcome: decision,
        resolution_days: resolutionDays,
        landlord_favoured: landlordFavoured,
        evidence_types: [],
      },
    ]);

    if (deposit.tenant_id) {
      try {
        await this.creditScoreService.calculateScore(deposit.tenant_id, {
          event_type: 'DISPUTE_RESOLVED',
          dispute_type: dispute.dispute_type,
          decision,
        });
      } catch (e) {
        // Score narrative is best-effort after dispute closure
      }
    }

    return { dispute_id: disputeId, status, decision, amount_to_tenant: amountToTenant };
  }

  async listLandlordOpenDisputes(landlordUserId: string) {
    const client = this.getClient();
    const landlordId = await this.getLandlordProfileId(landlordUserId);
    const { data: deposits, error: depositsError } = await client
      .from('deposits')
      .select('id, tenant_id, amount')
      .eq('landlord_id', landlordId);
    if (depositsError) throw depositsError;

    const depositIds = (deposits || []).map((d: any) => d.id);
    if (!depositIds.length) return [];

    const { data: disputes, error } = await client
      .from('disputes')
      .select('*')
      .in('deposit_id', depositIds)
      .in('status', ['OPEN', 'UNDER_REVIEW'])
      .order('opened_at', { ascending: false });
    if (error) throw error;

    const depositById = new Map((deposits || []).map((d: any) => [d.id, d]));
    const tenantIds = Array.from(new Set((deposits || []).map((d: any) => d.tenant_id).filter(Boolean)));
    const { data: profiles } = tenantIds.length
      ? await client.from('profiles').select('id, full_name').in('id', tenantIds)
      : { data: [] };
    const nameById = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));

    const rows = disputes || [];
    const enriched = await Promise.all(
      rows.map(async (dispute: any) => {
        const deposit = depositById.get(dispute.deposit_id);
        const timeline = await this.loadDisputeTimeline(dispute.id);
        const disputeType = (dispute.dispute_type as DisputeType) || 'OTHER';
        const template = DISPUTE_TEMPLATES[disputeType] || DISPUTE_TEMPLATES.OTHER;
        const openedAt = new Date(dispute.opened_at || dispute.created_at || Date.now());
        return {
          ...dispute,
          tenant_name: deposit ? nameById.get(deposit.tenant_id) || 'Tenant' : 'Tenant',
          deposit_amount: deposit?.amount ?? null,
          timeline,
          template,
          next_step: dispute.status === 'OPEN' ? 'Your review required' : 'Awaiting admin or settlement',
          estimated_resolution_by: new Date(openedAt.getTime() + template.eta_days * 86400000).toISOString(),
        };
      }),
    );
    return enriched;
  }

  async getDisputeOutcomeAnalytics() {
    const client = this.getClient();
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data: outcomes, error } = await client
      .from('dispute_outcomes')
      .select('outcome, dispute_type, resolution_days, landlord_favoured, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const rows = outcomes || [];
    const byOutcome: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalDays = 0;
    let landlordFavoured = 0;

    for (const row of rows) {
      byOutcome[row.outcome] = (byOutcome[row.outcome] || 0) + 1;
      const type = row.dispute_type || 'OTHER';
      byType[type] = (byType[type] || 0) + 1;
      totalDays += Number(row.resolution_days || 0);
      if (row.landlord_favoured) landlordFavoured += 1;
    }

    const total = rows.length;
    return {
      period_days: 90,
      total_resolved: total,
      median_resolution_days: total
        ? Math.round(
            [...rows.map((r) => Number(r.resolution_days || 0))].sort((a, b) => a - b)[
              Math.floor(total / 2)
            ] || 0,
          )
        : 0,
      avg_resolution_days: total ? Math.round(totalDays / total) : 0,
      landlord_favoured_rate: total ? Math.round((landlordFavoured / total) * 100) : 0,
      by_outcome: byOutcome,
      by_type: byType,
    };
  }

  async getLandlordDisputeRisk(landlordUserId: string) {
    const client = this.getClient();
    const landlordId = await this.getLandlordProfileId(landlordUserId);
    const { data: deposits } = await client.from('deposits').select('id').eq('landlord_id', landlordId);
    const depositIds = (deposits || []).map((d: { id: string }) => d.id);

    if (!depositIds.length) {
      return { open_count: 0, resolved_12m: 0, tenant_favoured_rate_pct: 0, risk_level: 'low' as const };
    }

    const { data: disputes, error } = await client.from('disputes').select('id, status, resolved_at').in('deposit_id', depositIds);
    if (error) throw error;

    const openCount = (disputes || []).filter((d: { status: string }) => ['OPEN', 'UNDER_REVIEW'].includes(d.status)).length;
    const since = new Date(Date.now() - 365 * 86400000).toISOString();
    const resolvedIds = (disputes || [])
      .filter(
        (d: { id: string; status: string; resolved_at?: string | null }) =>
          d.resolved_at && d.resolved_at >= since && RESOLVED_STATUSES.has(d.status),
      )
      .map((d: { id: string }) => d.id);

    let tenantFavouredRate = 0;
    if (resolvedIds.length) {
      const { data: outcomes } = await client
        .from('dispute_outcomes')
        .select('landlord_favoured')
        .in('dispute_id', resolvedIds);
      const total = outcomes?.length || 0;
      const landlordFavoured = (outcomes || []).filter((o: { landlord_favoured?: boolean }) => o.landlord_favoured).length;
      tenantFavouredRate = total ? Math.round(((total - landlordFavoured) / total) * 100) : 0;
    }

    const riskLevel =
      openCount >= 3 || tenantFavouredRate >= 60 ? 'high' : openCount >= 1 || tenantFavouredRate >= 40 ? 'medium' : 'low';

    return {
      open_count: openCount,
      resolved_12m: resolvedIds.length,
      tenant_favoured_rate_pct: tenantFavouredRate,
      risk_level: riskLevel,
    };
  }
}
