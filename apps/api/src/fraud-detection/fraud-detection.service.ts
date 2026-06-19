import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  detectConfirmRateAnomalies,
  detectSelfDealingPatterns,
  type LandlordConfirmStats,
  type PaymentIpPair,
} from './fraud-detection.util';

export type FraudFlagStatus = 'FLAGGED' | 'UNDER_REVIEW' | 'RESOLVED' | 'SUSPENDED';

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private getClient() {
    return this.supabase.getClient();
  }

  async listActiveFlags(limit = 100) {
    const client = this.getClient();
    const { data, error } = await client
      .from('platform_fraud_flags')
      .select('*')
      .in('status', ['FLAGGED', 'UNDER_REVIEW', 'SUSPENDED'])
      .order('flagged_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  async transitionFlag(
    adminId: string,
    flagId: string,
    status: FraudFlagStatus,
    resolutionNote?: string,
  ) {
    const allowed: FraudFlagStatus[] = ['UNDER_REVIEW', 'RESOLVED', 'SUSPENDED'];
    if (!allowed.includes(status)) {
      throw new BadRequestException('Invalid status transition');
    }

    const client = this.getClient();
    const { data: existing, error: fetchError } = await client
      .from('platform_fraud_flags')
      .select('*')
      .eq('id', flagId)
      .maybeSingle();
    if (fetchError || !existing) {
      throw new NotFoundException('Fraud flag not found');
    }

    const { data, error } = await client
      .from('platform_fraud_flags')
      .update({
        status,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        resolution_note: resolutionNote?.trim() || null,
      })
      .eq('id', flagId)
      .select()
      .single();
    if (error) throw error;

    await client.from('admin_audit_log').insert([
      {
        admin_id: adminId,
        action: 'FRAUD_FLAG_STATUS_CHANGE',
        target_user_id: existing.user_id,
        details: {
          flag_id: flagId,
          flag_type: existing.flag_type,
          from_status: existing.status,
          to_status: status,
          resolution_note: resolutionNote || null,
        },
      },
    ]);

    if (status === 'SUSPENDED') {
      await client.from('profiles').update({ partner_approval_status: 'SUSPENDED' }).eq('id', existing.user_id);
    }

    return data;
  }

  async runDetectionScan(adminId?: string) {
    const confirmFlags = await this.scanConfirmRateAnomalies(adminId);
    const selfDealFlags = await this.scanSelfDealingPatterns(adminId);
    const created = confirmFlags.length + selfDealFlags.length;

    if (adminId) {
      await this.getClient().from('admin_audit_log').insert([
        {
          admin_id: adminId,
          action: 'FRAUD_SCAN_RUN',
          details: {
            confirm_rate_flags: confirmFlags.length,
            self_dealing_flags: selfDealFlags.length,
          },
        },
      ]);
    }

    this.logger.log(`Fraud scan complete — ${created} new flag(s)`);
    return {
      confirm_rate_flags: confirmFlags.length,
      self_dealing_flags: selfDealFlags.length,
      total_new: created,
    };
  }

  private async scanConfirmRateAnomalies(adminId?: string) {
    const client = this.getClient();
    const since = new Date(Date.now() - 90 * 86400000).toISOString();

    const { data: payments, error } = await client
      .from('payments')
      .select('landlord_id, paid_date, eft_proof_uploaded_at, created_at, confirmed_via, payment_method, status')
      .eq('status', 'PAID')
      .eq('payment_method', 'EFT')
      .gte('paid_date', since);
    if (error) throw error;

    const lagHours = (p: { paid_date: string; eft_proof_uploaded_at?: string | null; created_at: string }) => {
      const start = new Date(p.eft_proof_uploaded_at || p.created_at).getTime();
      return Math.max(0, Math.round((new Date(p.paid_date).getTime() - start) / 3600000));
    };

    const allLags = (payments || []).map(lagHours).sort((a, b) => a - b);
    const platformMedian = allLags.length ? allLags[Math.floor(allLags.length / 2)] : 24;

    const byLandlord = new Map<string, { hours: number[]; auto: number; total: number }>();
    for (const p of payments || []) {
      if (!p.landlord_id || !p.paid_date) continue;
      const bucket = byLandlord.get(p.landlord_id) || { hours: [], auto: 0, total: 0 };
      bucket.hours.push(lagHours(p));
      bucket.total += 1;
      if (p.confirmed_via === 'AUTO') bucket.auto += 1;
      byLandlord.set(p.landlord_id, bucket);
    }

    const landlordProfileIds = [...byLandlord.keys()];
    const { data: profiles } = landlordProfileIds.length
      ? await client.from('landlord_profiles').select('id, user_id').in('id', landlordProfileIds)
      : { data: [] };
    const userByLandlordId = new Map((profiles || []).map((r: { id: string; user_id: string }) => [r.id, r.user_id]));

    const stats: LandlordConfirmStats[] = [...byLandlord.entries()].map(([landlordId, bucket]) => ({
      landlordUserId: userByLandlordId.get(landlordId) || landlordId,
      eftConfirmedCount: bucket.total,
      avgConfirmationHours: Math.round(bucket.hours.reduce((s, h) => s + h, 0) / bucket.hours.length),
      autoConfirmRatePct: Math.round((bucket.auto / bucket.total) * 100),
    }));

    const anomalies = detectConfirmRateAnomalies(stats, platformMedian);
    const created: string[] = [];

    for (const anomaly of anomalies) {
      const id = await this.upsertFlag({
        flag_type: 'CONFIRM_RATE_ANOMALY',
        user_id: anomaly.landlordUserId,
        severity: anomaly.severity,
        flag_note: anomaly.reason,
        metadata: anomaly.metadata,
      }, adminId);
      if (id) created.push(id);
    }

    return created;
  }

  private async scanSelfDealingPatterns(adminId?: string) {
    const client = this.getClient();
    const since = new Date(Date.now() - 180 * 86400000).toISOString();

    const { data: payments, error } = await client
      .from('payments')
      .select('id, tenant_id, landlord_id, eft_proof_client_ip, confirm_client_ip, status, paid_date')
      .eq('status', 'PAID')
      .gte('paid_date', since);
    if (error) throw error;

    const landlordIds = [...new Set((payments || []).map((p) => p.landlord_id).filter(Boolean))];
    const { data: landlordProfiles } = landlordIds.length
      ? await client.from('landlord_profiles').select('id, user_id').in('id', landlordIds)
      : { data: [] };
    const landlordUserById = new Map((landlordProfiles || []).map((r: { id: string; user_id: string }) => [r.id, r.user_id]));

    const pairs: PaymentIpPair[] = (payments || []).map((p) => ({
      paymentId: p.id,
      tenantUserId: p.tenant_id,
      landlordUserId: landlordUserById.get(p.landlord_id) || p.landlord_id,
      tenantIp: p.eft_proof_client_ip,
      landlordIp: p.confirm_client_ip,
    }));

    const matches = detectSelfDealingPatterns(pairs);
    const created: string[] = [];

    for (const match of matches) {
      const id = await this.upsertFlag({
        flag_type: 'SELF_DEALING_PATTERN',
        user_id: match.landlordUserId,
        related_user_id: match.tenantUserId,
        severity: match.paymentCount >= 3 ? 'high' : 'medium',
        flag_note: `Tenant and landlord share IP range ${match.sharedIp} on ${match.paymentCount} confirmed payment(s)`,
        metadata: {
          shared_ip_prefix: match.sharedIp,
          payment_count: match.paymentCount,
        },
      }, adminId);
      if (id) created.push(id);
    }

    return created;
  }

  private async upsertFlag(
    payload: {
      flag_type: string;
      user_id: string;
      related_user_id?: string;
      severity: string;
      flag_note: string;
      metadata: Record<string, unknown>;
    },
    adminId?: string,
  ): Promise<string | null> {
    const client = this.getClient();
    const { data: existing } = await client
      .from('platform_fraud_flags')
      .select('id')
      .eq('flag_type', payload.flag_type)
      .eq('user_id', payload.user_id)
      .eq('related_user_id', payload.related_user_id || null)
      .in('status', ['FLAGGED', 'UNDER_REVIEW'])
      .maybeSingle();

    if (existing?.id) return null;

    const { data, error } = await client
      .from('platform_fraud_flags')
      .insert([
        {
          flag_type: payload.flag_type,
          user_id: payload.user_id,
          related_user_id: payload.related_user_id || null,
          severity: payload.severity,
          flag_note: payload.flag_note,
          metadata: payload.metadata,
          status: 'FLAGGED',
        },
      ])
      .select('id')
      .single();
    if (error) {
      this.logger.warn(`Failed to insert fraud flag: ${error.message}`);
      return null;
    }

    if (adminId) {
      await client.from('admin_audit_log').insert([
        {
          admin_id: adminId,
          action: 'FRAUD_FLAG_CREATED',
          target_user_id: payload.user_id,
          details: {
            flag_id: data.id,
            flag_type: payload.flag_type,
            related_user_id: payload.related_user_id || null,
            metadata: payload.metadata,
          },
        },
      ]);
    }

    return data.id;
  }
}
