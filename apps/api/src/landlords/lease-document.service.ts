import { BadRequestException, Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { SupabaseService } from '../supabase/supabase.service';

export type LeaseDocumentInput = {
  unit_id: string;
  tenant_full_name: string;
  tenant_email?: string;
  tenant_phone?: string;
  tenant_id_number?: string;
  monthly_rent: number;
  deposit_amount?: number;
  start_date: string;
  end_date?: string;
  payment_method?: 'PLATFORM' | 'DIRECT';
  additional_terms?: string;
};

@Injectable()
export class LeaseDocumentService {
  constructor(private readonly supabase: SupabaseService) {}

  validateLeaseDocumentInput(payload: LeaseDocumentInput) {
    if (!payload?.unit_id?.trim()) {
      throw new BadRequestException('Select a unit for this lease.');
    }
    if (!payload?.tenant_full_name?.trim() || payload.tenant_full_name.trim().length < 2) {
      throw new BadRequestException('Tenant full legal name is required.');
    }
    const rent = Number(payload.monthly_rent);
    if (!Number.isFinite(rent) || rent <= 0) {
      throw new BadRequestException('Monthly rent must be greater than zero.');
    }
    if (!payload?.start_date?.trim()) {
      throw new BadRequestException('Lease start date is required.');
    }
    const start = new Date(payload.start_date);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('Invalid start date.');
    }
    if (payload.end_date) {
      const end = new Date(payload.end_date);
      if (Number.isNaN(end.getTime())) {
        throw new BadRequestException('Invalid end date.');
      }
      if (end < start) {
        throw new BadRequestException('End date must be on or after the start date.');
      }
    }
    const deposit = payload.deposit_amount != null ? Number(payload.deposit_amount) : rent;
    if (!Number.isFinite(deposit) || deposit < 0) {
      throw new BadRequestException('Deposit amount must be zero or greater.');
    }
    if (payload.payment_method && !['PLATFORM', 'DIRECT'].includes(payload.payment_method)) {
      throw new BadRequestException('Invalid payment method.');
    }
    return {
      ...payload,
      tenant_full_name: payload.tenant_full_name.trim(),
      monthly_rent: rent,
      deposit_amount: deposit,
      payment_method: payload.payment_method || 'PLATFORM',
    };
  }

  async resolveLeaseContext(landlordUserId: string, unitId: string) {
    const client = this.supabase.getClient();
    const { data: landlordProfile, error: lpError } = await client
      .from('landlord_profiles')
      .select('id, business_name, user_id')
      .eq('user_id', landlordUserId)
      .single();
    if (lpError || !landlordProfile) {
      throw new BadRequestException('Landlord profile not found.');
    }

    const { data: unit, error: unitError } = await client
      .from('units')
      .select('id, unit_identifier, monthly_rent, property_id')
      .eq('id', unitId)
      .single();
    if (unitError || !unit) {
      throw new BadRequestException('Unit not found.');
    }

    const { data: property, error: propError } = await client
      .from('properties')
      .select('id, property_name, address_street, address_suburb, address_city, address_postcode, landlord_id')
      .eq('id', unit.property_id)
      .single();
    if (propError || !property) {
      throw new BadRequestException('Property not found.');
    }
    if (property.landlord_id !== landlordProfile.id) {
      throw new BadRequestException('This unit does not belong to your portfolio.');
    }

    const { data: landlordUser } = await client.from('profiles').select('full_name, phone').eq('id', landlordUserId).maybeSingle();

    return {
      landlordProfile,
      landlordName: landlordProfile.business_name || landlordUser?.full_name || 'Landlord',
      landlordPhone: landlordUser?.phone || '',
      unit,
      property,
      addressLine: [property.address_street, property.address_suburb, property.address_city, property.address_postcode]
        .filter(Boolean)
        .join(', '),
    };
  }

  async generateLeaseAgreementPdf(landlordUserId: string, raw: LeaseDocumentInput): Promise<Buffer> {
    const payload = this.validateLeaseDocumentInput(raw);
    const ctx = await this.resolveLeaseContext(landlordUserId, payload.unit_id);

    const reference = `LA-${Date.now().toString(36).toUpperCase()}`;
    const paymentLabel =
      payload.payment_method === 'PLATFORM'
        ? 'Rent may be paid via the CRENIT platform (card, EFT, or mobile money where enabled).'
        : 'Rent is paid directly to the landlord; the landlord confirms receipt on CRENIT for credit reporting.';

    const bufferChunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.on('data', (chunk: Buffer) => bufferChunks.push(chunk));

    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(bufferChunks)));
      doc.on('error', reject);
    });

    const formatMoney = (n: number) => `N$${n.toLocaleString('en-NA', { minimumFractionDigits: 2 })}`;

    doc.fontSize(10).fillColor('#666').text('CRENIT Partner — Free lease template', { align: 'right' });
    doc.moveDown(0.5);
    doc.fontSize(20).fillColor('#1A1A1A').text('Residential Lease Agreement', { align: 'center' });
    doc.fontSize(11).fillColor('#666').text('Republic of Namibia', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(9).text(`Reference: ${reference} · Generated ${new Date().toLocaleDateString('en-NA')}`, { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(12).fillColor('#1A1A1A').text('1. Parties', { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor('#333');
    doc.text(`Landlord: ${ctx.landlordName}${ctx.landlordPhone ? ` · ${ctx.landlordPhone}` : ''}`);
    doc.text(`Tenant: ${payload.tenant_full_name}`);
    if (payload.tenant_email) doc.text(`Tenant email: ${payload.tenant_email}`);
    if (payload.tenant_phone) doc.text(`Tenant phone: ${payload.tenant_phone}`);
    if (payload.tenant_id_number) doc.text(`Tenant ID / passport: ${payload.tenant_id_number}`);
    doc.moveDown(1);

    doc.fontSize(12).fillColor('#1A1A1A').text('2. Premises', { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor('#333');
    doc.text(`Property: ${ctx.property.property_name}`);
    doc.text(`Unit: ${ctx.unit.unit_identifier}`);
    doc.text(`Address: ${ctx.addressLine}`);
    doc.moveDown(1);

    doc.fontSize(12).fillColor('#1A1A1A').text('3. Term', { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor('#333');
    doc.text(`Commencement: ${payload.start_date}`);
    doc.text(`Expiry: ${payload.end_date || 'Month-to-month thereafter unless terminated per this agreement'}`);
    doc.moveDown(1);

    doc.fontSize(12).fillColor('#1A1A1A').text('4. Rent and deposit', { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor('#333');
    doc.text(`Monthly rent: ${formatMoney(payload.monthly_rent)}`, { continued: false });
    doc.text(`Security deposit: ${formatMoney(payload.deposit_amount ?? payload.monthly_rent)}`);
    doc.text(`Payment: ${paymentLabel}`);
    doc.moveDown(1);

    doc.fontSize(12).fillColor('#1A1A1A').text('5. Standard terms', { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor('#333');
    const clauses = [
      'The tenant shall use the premises for residential purposes only and keep it in good order.',
      'The tenant shall not sublet without written consent from the landlord.',
      'The landlord shall maintain structural integrity; the tenant is responsible for minor upkeep unless otherwise agreed.',
      'Either party may terminate in accordance with applicable Namibian law and any notice period agreed in writing.',
      'Any disputes should first be addressed between the parties in good faith.',
    ];
    clauses.forEach((c, i) => doc.text(`${i + 1}. ${c}`, { paragraphGap: 4 }));

    if (payload.additional_terms?.trim()) {
      doc.moveDown(0.8);
      doc.fontSize(12).fillColor('#1A1A1A').text('6. Additional terms', { underline: true });
      doc.moveDown(0.4);
      doc.fontSize(10).fillColor('#333').text(payload.additional_terms.trim());
    }

    doc.moveDown(2);
    doc.fontSize(12).fillColor('#1A1A1A').text('7. Signatures', { underline: true });
    doc.moveDown(1.2);
    doc.fontSize(10).fillColor('#333');
    doc.text('Landlord: _________________________________    Date: ______________');
    doc.moveDown(1.2);
    doc.text('Tenant: _________________________________    Date: ______________');
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#888').text(
      'This document is a free CRENIT template for convenience only and does not constitute legal advice. ' +
        'Parties should seek independent legal review before signing. CRENIT is not a party to this agreement unless ' +
        'the lease is registered on the platform.',
      { align: 'justify' },
    );

    doc.end();
    return pdfPromise;
  }
}
