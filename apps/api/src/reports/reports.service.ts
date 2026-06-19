import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { buildVerifyUrl } from '../lib/verify-url';
import QRCode from 'qrcode';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { brandTierFromScore100 } from '../credit-score/tier-branding';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  private buildReportReference() {
    return `RC-${randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
  }

  async verifyReportReference(reference: string) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('report_verifications')
      .select('report_reference, score, tier, brand_tier, score_100, generated_at, expires_at, revoked_at')
      .eq('report_reference', reference)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    if (data.revoked_at) {
      return { ...data, invalid_reason: 'revoked' };
    }
    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      return { ...data, invalid_reason: 'expired' };
    }
    return data;
  }

  async generateShareableCreditReport(tenantId: string, expiryDays = 30): Promise<{ buffer: Buffer; reference: string; expires_at: string }> {
    const days = Math.min(90, Math.max(7, Math.floor(expiryDays)));
    const buffer = await this.generateTenantReport(tenantId, { expiryDays: days });
    const client = this.supabaseService.getClient();
    const { data: latest } = await client
      .from('report_verifications')
      .select('report_reference, expires_at')
      .eq('tenant_id', tenantId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return {
      buffer,
      reference: latest?.report_reference || '',
      expires_at: latest?.expires_at || new Date(Date.now() + days * 86400000).toISOString(),
    };
  }

  getReportStatus(): string {
    return 'Reports module is available.';
  }

  async generateTenantReport(tenantId: string, options?: { expiryDays?: number }): Promise<Buffer> {
    const client = this.supabaseService.getClient();

    const [profileRes, leasesRes, paymentsRes, depositsRes, scoreRes] = await Promise.all([
      client.from('profiles').select('*').eq('id', tenantId).single(),
      client.from('leases').select('*').eq('tenant_id', tenantId).order('start_date', { ascending: false }),
      client.from('payments').select('*').eq('tenant_id', tenantId).order('paid_date', { ascending: false }).limit(20),
      client.from('deposits').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(10),
      client.from('credit_scores').select('*').eq('tenant_id', tenantId).eq('is_current', true).order('calculation_date', { ascending: false }).limit(1),
    ]);

    if (profileRes.error || leasesRes.error || paymentsRes.error || depositsRes.error || scoreRes.error) {
      throw profileRes.error || leasesRes.error || paymentsRes.error || depositsRes.error || scoreRes.error;
    }

    const profile = profileRes.data;
    const leases = leasesRes.data || [];
    const payments = paymentsRes.data || [];
    const deposits = depositsRes.data || [];
    const score = scoreRes.data?.[0] ?? null;
    const scoreId = score?.id ?? null;

    let factors: any[] = [];
    if (scoreId) {
      const factorsRes = await client.from('credit_score_factors').select('*').eq('score_id', scoreId);
      if (!factorsRes.error) {
        factors = factorsRes.data || [];
      }
    }

    const userEmailRes = await client.from('auth.users').select('email').eq('id', tenantId).maybeSingle();
    const userEmail = userEmailRes.error ? 'N/A' : userEmailRes.data?.email ?? 'N/A';

    const verifiedPaymentRecords = payments.filter((row: any) => row.status === 'PAID').length;
    const earliestLeaseDate = leases.length
      ? leases
          .map((lease: any) => lease.start_date)
          .filter(Boolean)
          .sort()[0]
      : null;
    const tenancyMonths = earliestLeaseDate
      ? Math.max(1, Math.floor((Date.now() - new Date(earliestLeaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30)))
      : 0;
    const generatedAt = new Date().toISOString();
    const reportReference = this.buildReportReference();
    const verifyUrl = buildVerifyUrl(reportReference);
    const displayScore = Number(score?.score || 0);
    const score100 = Math.round(((displayScore - 300) / 600) * 1000) / 10;
    const brand = brandTierFromScore100(score100);
    const expiryDays = options?.expiryDays ?? 30;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: historyRows } = await client
      .from('score_history')
      .select('score, recorded_at')
      .eq('tenant_id', tenantId)
      .order('recorded_at', { ascending: true })
      .limit(12);

    await client.from('report_verifications').insert([
      {
        report_reference: reportReference,
        tenant_id: tenantId,
        score: displayScore,
        tier: score?.tier || 'BUILDING',
        brand_tier: brand.id,
        score_100: score100,
        generated_at: generatedAt,
        expires_at: expiresAt,
        score_calculation_date: score?.calculation_date || null,
        verified_payment_records: verifiedPaymentRecords,
        tenancy_months: tenancyMonths,
      },
    ]);

    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 150, margin: 1 });
    const qrImageBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    const bufferChunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    doc.on('data', (chunk: Buffer) => bufferChunks.push(chunk));
    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(bufferChunks)));
      doc.on('error', (err: Error) => reject(err));
    });

    doc.fontSize(20).font('Helvetica-Bold').fillColor('#C0392B').text('CRENIT Credit Report', { align: 'center' });
    doc.moveDown(0.25);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1A1A1A').text(`${brand.label} tier`, { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#666').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.text(`Valid until: ${new Date(expiresAt).toLocaleDateString()}`, { align: 'center' });
    doc.text(`Reference: ${reportReference}`, { align: 'center' });
    doc.moveDown();

    doc.fillColor('#000').fontSize(12).font('Helvetica-Bold').text('Tenant Details');
    doc.moveDown(0.25);
    doc.font('Helvetica').fontSize(10).text(`Name: ${profile?.full_name ?? 'N/A'}`);
    doc.text(`Email: ${userEmail}`);
    doc.text(`Tenant ID: ${tenantId}`);
    doc.text(`KYC Status: ${profile?.kyc_status ?? 'N/A'}`);
    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(12).text('Credit Score Summary');
    doc.moveDown(0.25);
    doc.font('Helvetica').fontSize(10).text(`CRENIT score: ${score100}/100 (${brand.label})`);
    doc.text(`Display score: ${score?.score ?? 'N/A'}`);
    doc.text(`Legacy tier: ${score?.tier ?? 'N/A'}`);
    doc.text(`Profile: ${brand.tagline}`);
    if (score?.calculation_date) {
      doc.text(`Calculated: ${new Date(score.calculation_date).toLocaleDateString()}`);
    }
    doc.text(`Verified payment records: ${verifiedPaymentRecords}`);
    doc.text(`Tenancy history months used: ${tenancyMonths}`);
    doc.moveDown();

    if ((historyRows || []).length) {
      doc.font('Helvetica-Bold').fontSize(12).text('Score history (recent)');
      doc.moveDown(0.25);
      (historyRows || []).slice(-6).forEach((row: any) => {
        doc.font('Helvetica').fontSize(10).text(
          `${new Date(row.recorded_at).toLocaleDateString()}: ${row.score}`,
        );
      });
      doc.moveDown();
    }

    if (factors.length) {
      doc.font('Helvetica-Bold').fontSize(12).text('Score Factor Breakdown');
      doc.moveDown(0.25);
      factors.forEach((factor) => {
        doc.font('Helvetica').fontSize(10).text(`${factor.factor_name}: ${factor.raw_value ?? 'N/A'} (${factor.weight * 100}% weight)`);
      });
      doc.moveDown();
    }

    const activeLease = leases.find((lease: any) => lease.status === 'ACTIVE') || leases[0] || null;
    doc.font('Helvetica-Bold').fontSize(12).text('Lease Summary');
    doc.moveDown(0.25);
    if (activeLease) {
      doc.font('Helvetica').fontSize(10).text(`Unit ID: ${activeLease.unit_id ?? 'N/A'}`);
      doc.text(`Monthly Rent: N$${Number(activeLease.monthly_rent ?? 0).toLocaleString()}`);
      doc.text(`Lease status: ${activeLease.status ?? 'N/A'}`);
      doc.text(`Start date: ${activeLease.start_date ?? 'N/A'}`);
      doc.text(`End date: ${activeLease.end_date ?? 'N/A'}`);
    } else {
      doc.font('Helvetica').fontSize(10).text('No active lease data available.');
    }
    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(12).text('Recent Payments');
    doc.moveDown(0.25);
    if (payments.length) {
      payments.slice(0, 10).forEach((payment: any, index: number) => {
        doc.font('Helvetica').fontSize(10).text(
          `${index + 1}. Amount: N$${Number(payment.amount_gross ?? 0).toLocaleString()} | Status: ${payment.status ?? 'N/A'} | Due: ${payment.due_date ?? 'N/A'} | Paid: ${payment.paid_date ?? 'N/A'}`,
        );
      });
    } else {
      doc.font('Helvetica').fontSize(10).text('No recent payments found.');
    }
    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(12).text('Deposit Status');
    doc.moveDown(0.25);
    if (deposits.length) {
      deposits.slice(0, 5).forEach((deposit: any, index: number) => {
        doc.font('Helvetica').fontSize(10).text(
          `${index + 1}. Amount: N$${Number(deposit.amount ?? 0).toLocaleString()} | Status: ${deposit.status ?? 'N/A'} | Created: ${deposit.created_at ?? 'N/A'}`,
        );
      });
    } else {
      doc.font('Helvetica').fontSize(10).text('No deposit records found.');
    }

    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(12).text('Verification & methodology');
    doc.moveDown(0.25);
    doc.font('Helvetica').fontSize(10).text(
      'This report is generated from verified rent payments on CRENIT. Scan the QR code or visit the URL to confirm authenticity.',
    );
    doc.text(`Verify: ${verifyUrl}`);
    doc.text(`Model: payment history 50% · defaults 30% · history length 20%.`);
    doc.image(qrImageBuffer, { width: 110 });

    doc.end();

    const buffer = await pdfPromise;
    this.logger.log(`Generated PDF report for tenant ${tenantId}`);
    return buffer;
  }

  async generateLandlordPortfolioReport(landlordId: string, month?: string): Promise<Buffer> {
    const client = this.supabaseService.getClient();
    const now = new Date();
    const { data: landlordProfile, error: profileError } = await client.from('landlord_profiles').select('*').eq('user_id', landlordId).single();
    if (profileError) throw profileError;

    const paymentsQuery = client.from('payments').select('*');
    if (month) {
      const monthStart = `${month}-01`;
      paymentsQuery.gte('paid_date', monthStart).lte('paid_date', `${month}-31`);
    }
    const { data: payments, error: paymentsError } = await paymentsQuery.order('paid_date', { ascending: false });
    if (paymentsError) throw paymentsError;

    const paymentTotal = (payments || []).reduce((sum: number, item: any) => sum + Number(item.amount_gross || 0), 0);
    const bufferChunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.on('data', (chunk: Buffer) => bufferChunks.push(chunk));
    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(bufferChunks)));
      doc.on('error', (err: Error) => reject(err));
    });

    doc.fontSize(18).font('Helvetica-Bold').text('CRENIT Landlord Portfolio Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').fillColor('#666').text(`Generated: ${now.toLocaleString()}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).font('Helvetica-Bold').text('Landlord Details');
    doc.moveDown(0.25);
    doc.font('Helvetica').fontSize(10).text(`Business Name: ${landlordProfile?.business_name ?? 'N/A'}`);
    doc.text(`Landlord ID: ${landlordProfile?.id ?? 'N/A'}`);
    doc.text(`Month: ${month ?? 'All time'}`);
    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(12).text('Portfolio Summary');
    doc.moveDown(0.25);
    doc.font('Helvetica').fontSize(10).text(`Total payments recorded: ${payments?.length ?? 0}`);
    doc.text(`Total gross amount: N$${Number(paymentTotal).toLocaleString()}`);
    doc.moveDown();

    if (payments && payments.length) {
      doc.font('Helvetica-Bold').fontSize(12).text('Recent Payments');
      doc.moveDown(0.25);
      payments.slice(0, 10).forEach((payment: any, index: number) => {
        doc.font('Helvetica').fontSize(10).text(
          `${index + 1}. Tenant: ${payment.tenant_id} | Amount: N$${Number(payment.amount_gross || 0).toLocaleString()} | Status: ${payment.status || 'N/A'} | Date: ${payment.paid_date || 'N/A'}`,
        );
      });
    }

    doc.end();
    const buffer = await pdfPromise;
    this.logger.log(`Generated portfolio report for landlord ${landlordId}`);
    return buffer;
  }

  async generateTenantPaymentReport(landlordId: string, tenantId: string): Promise<Buffer> {
    const client = this.supabaseService.getClient();
    const now = new Date();
    const { data: payments, error } = await client
      .from('payments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('paid_date', { ascending: false });
    if (error) throw error;

    const paymentTotal = (payments || []).reduce((sum: number, item: any) => sum + Number(item.amount_gross || 0), 0);
    const bufferChunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.on('data', (chunk: Buffer) => bufferChunks.push(chunk));
    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(bufferChunks)));
      doc.on('error', (err: Error) => reject(err));
    });

    doc.fontSize(18).font('Helvetica-Bold').text('CRENIT Tenant Payment Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').fillColor('#666').text(`Generated: ${now.toLocaleString()}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).font('Helvetica-Bold').text('Tenant Payment Summary');
    doc.moveDown(0.25);
    doc.font('Helvetica').fontSize(10).text(`Tenant ID: ${tenantId}`);
    doc.text(`Landlord ID: ${landlordId}`);
    doc.text(`Total payments: ${(payments || []).length}`);
    doc.text(`Total gross amount: N$${Number(paymentTotal).toLocaleString()}`);
    doc.moveDown();

    if (payments && payments.length) {
      payments.slice(0, 12).forEach((payment: any, index: number) => {
        doc.font('Helvetica').fontSize(10).text(
          `${index + 1}. Amount: N$${Number(payment.amount_gross || 0).toLocaleString()} | Status: ${payment.status || 'N/A'} | Paid: ${payment.paid_date || 'N/A'}`,
        );
      });
    }

    doc.end();
    const buffer = await pdfPromise;
    this.logger.log(`Generated landlord tenant report for ${tenantId}`);
    return buffer;
  }
}
