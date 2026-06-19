import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreditScoreService } from '../credit-score/credit-score.service';
import { SupabaseService } from '../supabase/supabase.service';
import { parsePaymentHistoryCsv } from './payment-history-import.util';

@Injectable()
export class PaymentHistoryImportService {
  private readonly logger = new Logger(PaymentHistoryImportService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly creditScoreService: CreditScoreService,
  ) {}

  async submitImport(
    tenantUserId: string,
    payload: { lease_id: string; csv_text: string; source_filename?: string },
  ) {
    const leaseId = payload.lease_id?.trim();
    if (!leaseId) throw new BadRequestException('lease_id is required');

    const client = this.supabase.getClient();
    const { data: lease, error: leaseError } = await client
      .from('leases')
      .select('id, tenant_id, landlord_id, monthly_rent, status')
      .eq('id', leaseId)
      .maybeSingle();

    if (leaseError || !lease?.id) throw new NotFoundException('Lease not found');
    if (lease.tenant_id !== tenantUserId) throw new BadRequestException('Lease does not belong to this tenant');

    const parsed = parsePaymentHistoryCsv(payload.csv_text || '');
    if (!parsed.rows.length) {
      throw new BadRequestException(parsed.errors[0] || 'No valid rows found in CSV');
    }
    if (parsed.errors.length) {
      throw new BadRequestException(parsed.errors.join(' '));
    }

    const { data: pending } = await client
      .from('payment_history_imports')
      .select('id')
      .eq('tenant_id', tenantUserId)
      .eq('status', 'PENDING')
      .limit(1);

    if (pending?.length) {
      throw new BadRequestException('You already have a pending import under review.');
    }

    const { data: importRow, error: importError } = await client
      .from('payment_history_imports')
      .insert([
        {
          tenant_id: tenantUserId,
          lease_id: leaseId,
          status: 'PENDING',
          source_filename: payload.source_filename?.trim() || null,
          row_count: parsed.rows.length,
        },
      ])
      .select('id')
      .single();

    if (importError || !importRow?.id) throw importError || new BadRequestException('Unable to create import');

    const entries = parsed.rows.map((row) => ({
      import_id: importRow.id,
      row_number: row.row_number,
      period_month: row.period_month,
      amount: row.amount,
      bank_reference: row.bank_reference || null,
      on_time: row.on_time,
      status: 'PENDING',
    }));

    const { error: entriesError } = await client.from('payment_history_import_entries').insert(entries);
    if (entriesError) throw entriesError;

    return {
      import_id: importRow.id,
      row_count: parsed.rows.length,
      message: 'Import submitted for admin review. Approved rows will count toward your credit score.',
    };
  }

  async listImportsForTenant(tenantUserId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('payment_history_imports')
      .select('id, lease_id, status, row_count, approved_count, submitted_at, reviewed_at, rejection_reason')
      .eq('tenant_id', tenantUserId)
      .order('submitted_at', { ascending: false })
      .limit(10);

    if (error?.code === '42P01') return [];
    if (error) throw error;
    return data || [];
  }

  async listPendingImports() {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('payment_history_imports')
      .select('id, tenant_id, lease_id, status, row_count, submitted_at, source_filename')
      .eq('status', 'PENDING')
      .order('submitted_at', { ascending: true });

    if (error?.code === '42P01') return [];
    if (error) throw error;
    return data || [];
  }

  async getImportDetail(importId: string) {
    const client = this.supabase.getClient();
    const { data: header, error } = await client
      .from('payment_history_imports')
      .select('*')
      .eq('id', importId)
      .maybeSingle();

    if (error || !header) throw new NotFoundException('Import not found');

    const { data: entries } = await client
      .from('payment_history_import_entries')
      .select('*')
      .eq('import_id', importId)
      .order('row_number', { ascending: true });

    return { ...header, entries: entries || [] };
  }

  async reviewImport(adminUserId: string, importId: string, action: 'approve' | 'reject', rejectionReason?: string) {
    const client = this.supabase.getClient();
    const detail = await this.getImportDetail(importId);
    if (detail.status !== 'PENDING') {
      throw new BadRequestException('Import is not pending review');
    }

    if (action === 'reject') {
      await client
        .from('payment_history_imports')
        .update({
          status: 'REJECTED',
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminUserId,
          rejection_reason: rejectionReason?.trim() || 'Rejected by admin',
        })
        .eq('id', importId);
      await client
        .from('payment_history_import_entries')
        .update({ status: 'REJECTED' })
        .eq('import_id', importId);
      return { import_id: importId, status: 'REJECTED' };
    }

    const { data: lease } = await client
      .from('leases')
      .select('id, tenant_id, landlord_id, monthly_rent')
      .eq('id', detail.lease_id)
      .maybeSingle();

    if (!lease?.id) throw new BadRequestException('Lease missing for import');

    let approvedCount = 0;
    for (const entry of detail.entries || []) {
      const dueDate = entry.period_month;
      const paidDate = entry.on_time ? entry.period_month : this.addDays(entry.period_month, 3);
      const daysOverdue = entry.on_time ? 0 : 3;

      const { data: payment, error: paymentError } = await client
        .from('payments')
        .insert([
          {
            tenant_id: lease.tenant_id,
            landlord_id: lease.landlord_id,
            lease_id: lease.id,
            amount_gross: entry.amount,
            due_date: dueDate,
            paid_date: paidDate,
            days_overdue: daysOverdue,
            status: 'PAID',
            payment_method: 'EFT',
            confirmed_via: 'IMPORT',
            is_simulated: false,
            eft_payment_reference: entry.bank_reference || null,
          },
        ])
        .select('id')
        .single();

      if (paymentError || !payment?.id) {
        this.logger.warn(`Import row ${entry.row_number} failed: ${paymentError?.message}`);
        continue;
      }

      await client
        .from('payment_history_import_entries')
        .update({ status: 'APPROVED', payment_id: payment.id })
        .eq('id', entry.id);
      approvedCount += 1;
    }

    await client
      .from('payment_history_imports')
      .update({
        status: 'APPROVED',
        approved_count: approvedCount,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUserId,
      })
      .eq('id', importId);

    if (approvedCount > 0) {
      await this.creditScoreService.calculateScore(lease.tenant_id, {
        event_type: 'IMPORT_HISTORY',
        due_date: detail.entries?.[0]?.period_month,
        paid_date: detail.entries?.[0]?.period_month,
      });
    }

    return { import_id: importId, status: 'APPROVED', approved_count: approvedCount };
  }

  private addDays(isoDate: string, days: number): string {
    const d = new Date(isoDate);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
}
