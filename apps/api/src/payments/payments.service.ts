import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { SupabaseService } from '../supabase/supabase.service';
import { CreditScoreService } from '../credit-score/credit-score.service';
import { MarketIntelligenceCaptureService } from '../market-intelligence/market-intelligence-capture.service';

type PaymentInitiationPayload = {
  property_unit_id: string;
  lease_id?: string;
  amount: number;
  payment_method: 'EFT' | 'CARD' | 'MOBILE_MONEY';
  payment_details: Record<string, any>;
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly creditScoreService: CreditScoreService,
    private readonly marketCapture: MarketIntelligenceCaptureService,
  ) {}

  private async onPaymentConfirmed(payment: Record<string, unknown> | null) {
    if (!payment || payment.status !== 'PAID') return;
    await this.marketCapture.captureFromPayment(payment as Parameters<MarketIntelligenceCaptureService['captureFromPayment']>[0]);
  }

  private getClient() {
    return this.supabase.getClient();
  }

  private calculateCommission(amount: number, transactionType: string) {
    let rate = 0.01;

    switch (transactionType) {
      case 'rent_on_time':
        rate = 0.01;
        break;
      case 'rent_late':
        rate = 0.015;
        break;
      case 'deposit_collection':
        rate = 0.005;
        break;
      case 'deposit_refund':
        rate = 0;
        break;
      default:
        rate = 0.01;
    }

    const commissionAmount = Number((amount * rate).toFixed(2));
    const netAmount = Number((amount - commissionAmount).toFixed(2));

    return {
      commissionAmount,
      commissionRate: rate * 100,
      netAmount,
    };
  }

  private getCurrentMonthStart(): string {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
  }

  private async resolveLease(tenantId: string, leaseId?: string, unitId?: string) {
    const client = this.getClient();
    if (leaseId) {
      const { data, error } = await client.from('leases').select('*').eq('id', leaseId).single();
      if (error || !data) {
        throw new NotFoundException('Lease not found');
      }
      return data;
    }

    if (!unitId) {
      throw new BadRequestException('lease_id or property_unit_id is required to resolve lease');
    }

    const { data, error } = await client
      .from('leases')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('unit_id', unitId)
      .eq('status', 'ACTIVE')
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new NotFoundException('Active lease not found for tenant and unit');
    }
    return data;
  }

  private async getLandlordProfileId(userId: string) {
    const client = this.getClient();
    const { data, error } = await client.from('landlord_profiles').select('id').eq('user_id', userId).single();
    if (error || !data) {
      throw new NotFoundException('Landlord profile not found');
    }
    return data.id;
  }

  private async savePaymentMethod(userId: string, methodType: 'CARD' | 'MOBILE_MONEY', details: any) {
    const client = this.getClient();
    const lastFour = methodType === 'CARD' && details.card_number ? String(details.card_number).slice(-4) : null;
    const record = {
      user_id: userId,
      type: methodType,
      details,
      last_four: lastFour,
      is_default: true,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await client.from('payment_methods').insert([record]).select().limit(1);
    if (error) {
      this.logger.warn('Failed to save payment method: ' + error.message);
      return null;
    }
    return data && data[0] ? data[0] : null;
  }

  private async buildPaymentRecord(payload: {
    tenant_id: string;
    lease_id: string;
    unit_id: string;
    landlord_id: string;
    amount: number;
    payment_method: string;
    status: string;
    payment_details: any;
    due_date: string;
    paid_date?: string;
    days_overdue?: number;
    transactionId?: string;
  }) {
    const client = this.getClient();
    const transactionType = payload.status === 'PAID' ? 'rent_on_time' : 'rent_late';
    const commission = this.calculateCommission(payload.amount, transactionType);
    const now = new Date().toISOString();

    const insertObj: any = {
      tenant_id: payload.tenant_id,
      lease_id: payload.lease_id,
      unit_id: payload.unit_id,
      landlord_id: payload.landlord_id,
      amount_gross: payload.amount,
      commission_rate: commission.commissionRate / 100,
      commission_amount: commission.commissionAmount,
      amount_net: commission.netAmount,
      payment_method: payload.payment_method,
      status: payload.status,
      due_date: payload.due_date,
      paid_date: payload.paid_date || (payload.status === 'PAID' ? now : null),
      days_overdue: payload.days_overdue || 0,
      sim_transaction_id: payload.transactionId || `RC-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      notes: JSON.stringify(payload.payment_details || {}),
      receipt_url: `/payments/receipt/${payload.transactionId || ''}`,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await client.from('payments').insert([insertObj]).select().limit(1);
    if (error) {
      throw error;
    }
    const payment = data && data[0] ? data[0] : null;
    if (payment?.status === 'PAID') {
      await this.onPaymentConfirmed(payment);
    }
    return payment;
  }

  async initiatePayment(tenantId: string, body: PaymentInitiationPayload) {
    const lease = await this.resolveLease(tenantId, body.lease_id, body.property_unit_id);
    const dueDate = this.getCurrentMonthStart();
    const daysOverdue = Math.max(0, Math.floor((new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)));
    const isLate = daysOverdue > 0;

    const paymentDetails = {
      ...body.payment_details,
      initiated_at: new Date().toISOString(),
      method: body.payment_method,
    };

    if (body.payment_method === 'EFT') {
      const reference = `RC${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const bankDetails = {
        bankName: 'First National Bank Namibia',
        accountName: 'RentCredit Collections',
        accountNumber: '62234567890',
        branchCode: '280172',
        reference,
      };

      const payment = await this.buildPaymentRecord({
        tenant_id: tenantId,
        lease_id: lease.id,
        unit_id: lease.unit_id,
        landlord_id: lease.landlord_id,
        amount: body.amount,
        payment_method: 'EFT',
        status: 'PENDING',
        payment_details: { ...paymentDetails, reference },
        due_date: dueDate,
        days_overdue: daysOverdue,
      });

      return {
        payment_id: payment?.id,
        status: 'pending_confirmation',
        receipt_url: payment?.receipt_url,
        commission_amount: payment?.commission_amount,
        net_amount: payment?.amount_net,
        payment_details: { bank_details: bankDetails, reference, expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() },
      };
    }

    if (body.payment_method === 'CARD' || body.payment_method === 'MOBILE_MONEY') {
      const preAuth = {
        transactionId: `TX-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        status: 'PAID',
      };

      if (body.payment_method === 'CARD' && body.payment_details.save_for_auto_pay) {
        await this.savePaymentMethod(tenantId, 'CARD', {
          masked_number: `**** **** **** ${String(body.payment_details.card_number || '').slice(-4)}`,
          expiry: body.payment_details.expiry,
          provider: body.payment_details.provider || 'CARD',
        });
      }

      if (body.payment_method === 'MOBILE_MONEY') {
        await this.savePaymentMethod(tenantId, 'MOBILE_MONEY', {
          phone_number: body.payment_details.phone_number,
          provider: body.payment_details.provider,
        });
      }

      const payment = await this.buildPaymentRecord({
        tenant_id: tenantId,
        lease_id: lease.id,
        unit_id: lease.unit_id,
        landlord_id: lease.landlord_id,
        amount: body.amount,
        payment_method: body.payment_method,
        status: preAuth.status,
        payment_details: paymentDetails,
        due_date: dueDate,
        paid_date: new Date().toISOString(),
        days_overdue: daysOverdue,
        transactionId: preAuth.transactionId,
      });

      await this.creditScoreService.calculateScore(tenantId);

      return {
        payment_id: payment?.id,
        status: payment?.status,
        receipt_url: payment?.receipt_url,
        commission_amount: payment?.commission_amount,
        net_amount: payment?.amount_net,
        payment_details: body.payment_method === 'MOBILE_MONEY' ? { user_prompt: 'Please complete the mobile money authorization on your phone.' } : {},
      };
    }

    throw new BadRequestException('Unsupported payment method');
  }

  async getTenantPaymentHistory(tenantId: string, options: { limit: number; offset: number; year?: number }) {
    const client = this.getClient();
    let query = client.from('payments').select('*').eq('tenant_id', tenantId).order('paid_date', { ascending: false });
    if (options.year) {
      const start = new Date(options.year, 0, 1).toISOString().slice(0, 10);
      const end = new Date(options.year + 1, 0, 1).toISOString().slice(0, 10);
      query = query.gte('paid_date', start).lt('paid_date', end);
    }
    const { data, error } = await query.range(options.offset, options.offset + options.limit - 1);
    if (error) throw error;

    const payments = data || [];
    const totalPaidYear = payments.reduce((sum: number, payment: any) => sum + Number(payment.amount_gross || 0), 0);
    const onTimeRate = payments.length ? Math.round((payments.filter((payment: any) => payment.status === 'PAID').length / payments.length) * 100) : 0;
    const streak = payments.slice(0, 12).filter((payment: any) => payment.status === 'PAID').length;

    return {
      payments,
      on_time_rate: onTimeRate,
      streak,
      total_paid_year: totalPaidYear,
    };
  }

  async getUpcomingPayments(tenantId: string) {
    const client = this.getClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await client
      .from('payments')
      .select('*')
      .eq('tenant_id', tenantId)
      .neq('status', 'PAID')
      .gte('due_date', today)
      .order('due_date', { ascending: true })
      .limit(1);

    if (error) throw error;

    const nextPayment = data && data[0] ? data[0] : null;
    const autoPayEnabled = await this.isAutoPayEnabled(tenantId);

    return {
      next_payment: nextPayment
        ? {
            due_date: nextPayment.due_date,
            amount: nextPayment.amount_gross,
            property: nextPayment.unit_id,
            days_until_due: Math.max(0, Math.floor((new Date(nextPayment.due_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24))),
          }
        : null,
      auto_pay_enabled: autoPayEnabled,
    };
  }

  async isAutoPayEnabled(tenantId: string) {
    const client = this.getClient();
    const { data, error } = await client.from('auto_pay_config').select('*').eq('tenant_id', tenantId).eq('is_active', true).limit(1).maybeSingle();
    if (error) {
      this.logger.warn('Failed to check auto-pay status: ' + error.message);
      return false;
    }
    return !!data;
  }

  async setupAutoPay(tenantId: string, paymentMethodId: string, payDayOffset: number) {
    const client = this.getClient();
    const nextPaymentDate = this.getNextPaymentDate(payDayOffset);
    const { data, error } = await client.from('auto_pay_config').upsert([
      {
        tenant_id: tenantId,
        payment_method_id: paymentMethodId,
        is_active: true,
        pay_day_offset: payDayOffset,
        next_payment_date: nextPaymentDate,
        updated_at: new Date().toISOString(),
      },
    ], { onConflict: 'tenant_id' }).select().limit(1);
    if (error) throw error;
    return {
      success: true,
      next_auto_payment: nextPaymentDate,
    };
  }

  async cancelAutoPay(tenantId: string) {
    const client = this.getClient();
    const { error } = await client.from('auto_pay_config').update({ is_active: false, updated_at: new Date().toISOString() }).eq('tenant_id', tenantId);
    if (error) throw error;
    return { success: true, message: 'Auto-pay cancelled' };
  }

  private getNextPaymentDate(payDayOffset: number) {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1 - payDayOffset);
    return next.toISOString().slice(0, 10);
  }

  async recordPayment(payload: {
    tenant_id: string;
    lease_id?: string;
    amount: number;
    paid_date?: string;
    payment_method?: string;
  }) {
    const client = this.getClient();
    const now = new Date().toISOString();
    const paymentAmount = Number(payload.amount || 0);
    const commissionRate = 0.01;
    const commissionAmount = Number((paymentAmount * commissionRate).toFixed(2));
    const netAmount = Number((paymentAmount - commissionAmount).toFixed(2));

    const insertObj: any = {
      tenant_id: payload.tenant_id,
      lease_id: payload.lease_id || null,
      amount_gross: paymentAmount,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      amount_net: netAmount,
      due_date: payload.paid_date ? payload.paid_date.slice(0, 10) : now.slice(0, 10),
      paid_date: payload.paid_date || now,
      payment_method: payload.payment_method || 'SIMULATED',
      status: 'PAID',
      is_simulated: true,
      sim_transaction_id: `SIM-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      created_at: now,
      updated_at: now,
    };

    if (payload.lease_id) {
      const lease = await client.from('leases').select('*').eq('id', payload.lease_id).single();
      if (lease.error || !lease.data) {
        throw new NotFoundException('Lease not found');
      }
      insertObj.landlord_id = lease.data.landlord_id;
      insertObj.unit_id = lease.data.unit_id;
    }

    const { data, error } = await client.from('payments').insert([insertObj]).select().limit(1);
    if (error) throw error;

    const payment = data && data[0] ? data[0] : null;
    if (payment && payment.tenant_id) {
      try {
        await this.creditScoreService.calculateScore(payment.tenant_id);
      } catch (e) {
        this.logger.error('Failed to recalculate credit score after webhook payment', e as any);
      }
    }
    await this.onPaymentConfirmed(payment);
    return payment;
  }

  async recordWebhookEvent(eventId: string, type: string, payload: any) {
    const client = this.getClient();
    if (!eventId) return { duplicated: false, row: null };

    const { data: existing, error: selErr } = await client.from('webhook_events').select('*').eq('event_id', eventId).limit(1);
    if (selErr) {
      this.logger.warn('Could not check webhook_events table: ' + selErr.message);
    }

    if (existing && existing.length) {
      return { duplicated: true, row: existing[0] };
    }

    const insertObj = {
      event_id: eventId,
      type,
      payload: payload && typeof payload === 'object' ? payload : null,
      received_at: new Date().toISOString(),
    };

    const { data: inserted, error: insErr } = await client.from('webhook_events').insert([insertObj]).select().limit(1);
    if (insErr) {
      this.logger.warn('Failed to insert webhook event: ' + insErr.message);
      return { duplicated: false, row: null };
    }

    return { duplicated: false, row: inserted && inserted[0] ? inserted[0] : null };
  }

  async sendReceiptPdf(tenantId: string, paymentId: string, res: Response) {
    const client = this.getClient();
    const { data: payment, error } = await client.from('payments').select('*').eq('id', paymentId).single();
    if (error || !payment) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.tenant_id !== tenantId) {
      throw new BadRequestException('Unauthorized access to receipt');
    }

    const [{ data: tenant }, { data: landlord }, { data: unit }] = await Promise.all([
      client.from('profiles').select('full_name,phone,email').eq('id', payment.tenant_id).single(),
      client.from('landlord_profiles').select('business_name,bank_account_name,bank_name').eq('id', payment.landlord_id).single(),
      client.from('units').select('unit_identifier,bedrooms,bathrooms,monthly_rent,property_id').eq('id', payment.unit_id).single(),
    ]);

    if (!tenant || !landlord || !unit) {
      throw new NotFoundException('Receipt source data is incomplete');
    }

    const { data: property } = await client.from('properties').select('address_street,address_suburb,address_city,property_type').eq('id', unit.property_id).single();

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rentcredit-receipt-${paymentId}.pdf"`);

    doc.fontSize(20).text('RentCredit Payment Receipt', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Receipt #: ${paymentId}`);
    doc.text(`Payment Date: ${payment.paid_date || new Date().toISOString()}`);
    doc.text(`Status: ${payment.status}`);
    doc.moveDown();

    doc.fontSize(12).text('Tenant Information', { underline: true });
    doc.text(`${tenant.full_name}`);
    doc.text(`${tenant.email || 'n/a'}`);
    doc.text(`${tenant.phone || 'n/a'}`);
    doc.moveDown();

    doc.fontSize(12).text('Landlord Information', { underline: true });
    doc.text(`${landlord.business_name || 'RentCredit landlord'}`);
    doc.text(`${landlord.bank_name || 'n/a'}`);
    doc.moveDown();

    doc.fontSize(12).text('Property Details', { underline: true });
    doc.text(`${property?.address_street || 'n/a'}, ${property?.address_suburb || ''}, ${property?.address_city || ''}`);
    doc.text(`Unit: ${unit.unit_identifier || 'n/a'}`);
    doc.text(`Type: ${property?.property_type || 'n/a'}`);
    doc.moveDown();

    doc.fontSize(12).text('Payment Summary', { underline: true });
    doc.text(`Amount Paid: N$ ${Number(payment.amount_gross).toFixed(2)}`);
    doc.text(`Commission: N$ ${Number(payment.commission_amount).toFixed(2)} (${Number(payment.commission_rate) * 100}%)`);
    doc.text(`Net to Landlord: N$ ${Number(payment.amount_net).toFixed(2)}`);
    doc.text(`Payment Method: ${payment.payment_method}`);
    doc.text(`Days Late: ${payment.days_overdue || 0}`);

    doc.end();
    doc.pipe(res);
  }

  async confirmLandlordPayment(landlordUserId: string, paymentId: string) {
    const client = this.getClient();
    const landlordProfileId = await this.getLandlordProfileId(landlordUserId);

    const { data: payment, error } = await client.from('payments').select('*').eq('id', paymentId).single();
    if (error || !payment) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.landlord_id !== landlordProfileId) {
      throw new BadRequestException('Payment does not belong to this landlord');
    }
    if (payment.status === 'PAID') {
      throw new BadRequestException('Payment is already confirmed');
    }
    if (!['PENDING', 'PROCESSING', 'OVERDUE'].includes(payment.status)) {
      throw new BadRequestException(`Cannot confirm payment with status ${payment.status}`);
    }

    const now = new Date().toISOString();
    const daysOverdue = Number(payment.days_overdue || 0);
    const transactionType = daysOverdue > 0 ? 'rent_late' : 'rent_on_time';
    const commission = this.calculateCommission(Number(payment.amount_gross), transactionType);

    const { data: updated, error: updateError } = await client
      .from('payments')
      .update({
        status: 'PAID',
        paid_date: now,
        commission_rate: commission.commissionRate / 100,
        commission_amount: commission.commissionAmount,
        amount_net: commission.netAmount,
        updated_at: now,
      })
      .eq('id', paymentId)
      .select()
      .limit(1);

    if (updateError) {
      throw updateError;
    }

    const confirmed = updated && updated[0] ? updated[0] : null;
    if (confirmed?.tenant_id) {
      try {
        await this.creditScoreService.calculateScore(confirmed.tenant_id);
      } catch (e) {
        this.logger.error('Failed to recalculate credit score after payment confirmation', e as any);
      }
    }
    await this.onPaymentConfirmed(confirmed);

    return confirmed;
  }

  async getLandlordPayments(
    landlordUserId: string,
    filters: { propertyUnitId?: string; status?: string; month?: string; page: number; limit: number },
  ) {
    const client = this.getClient();
    const landlordProfileId = await this.getLandlordProfileId(landlordUserId);

    let query = client.from('payments').select('*').eq('landlord_id', landlordProfileId).order('created_at', { ascending: false });
    if (filters.propertyUnitId) {
      query = query.eq('unit_id', filters.propertyUnitId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.month) {
      const [year, month] = filters.month.split('-').map(Number);
      if (!Number.isNaN(year) && !Number.isNaN(month)) {
        const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
        const end = new Date(year, month, 1).toISOString().slice(0, 10);
        query = query.gte('created_at', start).lt('created_at', end);
      }
    }

    const offset = (filters.page - 1) * filters.limit;
    const { data, error } = await query.range(offset, offset + filters.limit - 1);
    if (error) throw error;

    const payments = data || [];
    const totalExpected = payments.reduce((sum: number, payment: any) => sum + Number(payment.amount_gross || 0), 0);
    const totalCollected = payments.reduce((sum: number, payment: any) => sum + (payment.status === 'PAID' ? Number(payment.amount_gross || 0) : 0), 0);
    const totalCommission = payments.reduce((sum: number, payment: any) => sum + Number(payment.commission_amount || 0), 0);
    const outstanding = payments.reduce((sum: number, payment: any) => sum + (payment.status !== 'PAID' ? Number(payment.amount_gross || 0) : 0), 0);
    const collectionRate = totalExpected === 0 ? 0 : Math.round((totalCollected / totalExpected) * 100);

    const formattedPayments = payments.map((payment: any) => ({
      id: payment.id,
      tenant_name: payment.tenant_id,
      property: payment.unit_id,
      amount: payment.amount_gross,
      commission: payment.commission_amount,
      net_amount: payment.amount_net,
      status: payment.status,
      date: payment.paid_date,
      month: payment.due_date ? payment.due_date.slice(0, 7) : null,
    }));

    return {
      payments: formattedPayments,
      summary: {
        total_expected: totalExpected,
        total_collected: totalCollected,
        total_commission: totalCommission,
        outstanding,
        collection_rate: collectionRate,
      },
      total: payments.length,
      page: filters.page,
    };
  }

  async recordOverduePayments() {
    const client = this.getClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data: payments, error } = await client
      .from('payments')
      .select('*')
      .in('status', ['PENDING', 'PROCESSING'])
      .lt('due_date', today);
    if (error) throw error;

    for (const payment of payments || []) {
      await client.from('payments').update({ status: 'OVERDUE', updated_at: new Date().toISOString() }).eq('id', payment.id);
    }
  }

  async processAutoPayments() {
    const client = this.getClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data: configs, error } = await client
      .from('auto_pay_config')
      .select('*')
      .eq('is_active', true)
      .lte('next_payment_date', today);
    if (error) throw error;

    for (const config of configs || []) {
      try {
        await this.processAutoPayment(config.tenant_id, config.payment_method_id, config.pay_day_offset || 1);
        const nextDate = this.getNextPaymentDate(config.pay_day_offset || 1);
        await client.from('auto_pay_config').update({ next_payment_date: nextDate, updated_at: new Date().toISOString() }).eq('id', config.id);
      } catch (e) {
        this.logger.error(`Auto-pay failed for tenant ${config.tenant_id}: ${(e as any).message}`);
      }
    }
  }

  private async processAutoPayment(tenantId: string, paymentMethodId: string, payDayOffset: number) {
    const client = this.getClient();
    const [{ data: method, error: methodError }, { data: lease, error: leaseError }] = await Promise.all([
      client.from('payment_methods').select('*').eq('id', paymentMethodId).single(),
      client.from('leases').select('*').eq('tenant_id', tenantId).eq('status', 'ACTIVE').limit(1).maybeSingle(),
    ]);

    if (methodError || !method) {
      throw new NotFoundException('Auto-pay method not found');
    }
    if (leaseError || !lease) {
      throw new NotFoundException('Active lease not found for auto-pay');
    }

    await this.initiatePayment(tenantId, {
      amount: Number(lease.monthly_rent || 0),
      payment_method: method.type === 'CARD' ? 'CARD' : 'MOBILE_MONEY',
      payment_details: method.details,
      lease_id: lease.id,
      property_unit_id: lease.unit_id,
    });
  }
}
