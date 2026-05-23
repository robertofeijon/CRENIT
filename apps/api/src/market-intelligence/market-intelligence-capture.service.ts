import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ConsentService } from './consent.service';
import {
  daysBetween,
  derivePaymentStatus,
  hashUserId,
  incomeToBracket,
  monthYearFromDate,
} from './market-intelligence.utils';

type PaymentRow = {
  id: string;
  tenant_id?: string;
  landlord_id?: string;
  lease_id?: string;
  unit_id?: string;
  amount_gross: number;
  due_date: string;
  paid_date?: string | null;
  status: string;
  days_overdue?: number;
};

@Injectable()
export class MarketIntelligenceCaptureService {
  private readonly logger = new Logger(MarketIntelligenceCaptureService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly consentService: ConsentService,
  ) {}

  private mi() {
    return this.supabase.getClient().schema('market_intelligence');
  }

  /**
   * Called automatically when a payment reaches PAID status.
   * Never invoked by user-facing actions directly.
   */
  async captureFromPayment(payment: PaymentRow): Promise<void> {
    if (!payment?.id || payment.status !== 'PAID') return;

    try {
      const existing = await this.mi().from('market_data_records').select('id').eq('payment_id', payment.id).maybeSingle();
      if (existing.data) return;

      if (!payment.tenant_id) {
        this.logger.warn(`Skipping market capture for payment ${payment.id}: no tenant_id`);
        return;
      }

      const [tenantConsent, landlordConsent] = await Promise.all([
        this.consentService.hasConsent(payment.tenant_id, 'TENANT_MARKET_DATA'),
        payment.landlord_id ? this.resolveLandlordUserId(payment.landlord_id).then((uid) =>
          uid ? this.consentService.hasConsent(uid, 'LANDLORD_MARKET_DATA') : Promise.resolve(false),
        ) : Promise.resolve(false),
      ]);

      if (!tenantConsent && !landlordConsent) {
        this.logger.debug(`Market capture skipped for payment ${payment.id}: no consent`);
        return;
      }

      const context = await this.loadPaymentContext(payment);
      if (!context) return;

      const daysToPay = daysBetween(payment.due_date, payment.paid_date ?? new Date().toISOString());
      const paymentStatus = derivePaymentStatus(daysToPay, payment.status);
      const monthYear = monthYearFromDate(payment.paid_date ?? payment.due_date);

      const record = {
        payment_id: payment.id,
        suburb: context.suburb,
        city: context.city,
        property_type: context.property_type,
        bedrooms: context.bedrooms,
        geo_lat: context.geo_lat,
        geo_lng: context.geo_lng,
        verified_rent_amount: Number(payment.amount_gross),
        payment_status: paymentStatus,
        days_to_pay: daysToPay,
        lease_start_date: context.lease_start_date,
        income_bracket: tenantConsent ? incomeToBracket(context.tenant_income) : null,
        deposit_ratio: context.deposit_ratio,
        month_year: monthYear,
        tenant_hash: payment.tenant_id ? hashUserId(payment.tenant_id) : null,
        landlord_hash: context.landlord_user_id ? hashUserId(context.landlord_user_id) : null,
      };

      const { error } = await this.mi().from('market_data_records').insert([record]);
      if (error) {
        this.logger.error(`Failed to write market_data_record for payment ${payment.id}: ${error.message}`);
      }
    } catch (err) {
      this.logger.error(`Market intelligence capture failed for payment ${payment.id}`, err as Error);
    }
  }

  private async resolveLandlordUserId(landlordProfileId: string): Promise<string | null> {
    const client = this.supabase.getClient();
    const { data } = await client.from('landlord_profiles').select('user_id').eq('id', landlordProfileId).maybeSingle();
    return data?.user_id ?? null;
  }

  private async loadPaymentContext(payment: PaymentRow) {
    const client = this.supabase.getClient();

    let unitId = payment.unit_id;
    let leaseStart: string | null = null;
    let monthlyRent: number | null = null;

    if (payment.lease_id) {
      const { data: lease } = await client
        .from('leases')
        .select('unit_id, start_date, monthly_rent')
        .eq('id', payment.lease_id)
        .maybeSingle();
      if (lease) {
        unitId = lease.unit_id ?? unitId;
        leaseStart = lease.start_date;
        monthlyRent = Number(lease.monthly_rent);
      }
    }

    if (!unitId) return null;

    const { data: unit } = await client
      .from('units')
      .select('bedrooms, property_id, monthly_rent')
      .eq('id', unitId)
      .maybeSingle();
    if (!unit?.property_id) return null;

    const { data: property } = await client
      .from('properties')
      .select('address_suburb, address_city, property_type, geo_lat, geo_lng, landlord_id')
      .eq('id', unit.property_id)
      .maybeSingle();
    if (!property?.address_suburb) return null;

    let depositRatio: number | null = null;
    if (payment.tenant_id && payment.lease_id) {
      const { data: deposit } = await client
        .from('deposits')
        .select('amount')
        .eq('lease_id', payment.lease_id)
        .eq('tenant_id', payment.tenant_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const rent = monthlyRent ?? Number(unit.monthly_rent);
      if (deposit?.amount && rent > 0) {
        depositRatio = Number((Number(deposit.amount) / rent).toFixed(2));
      }
    }

    let tenantIncome: number | null = null;
    if (payment.tenant_id) {
      const { data: profile } = await client.from('profiles').select('income_monthly').eq('id', payment.tenant_id).maybeSingle();
      tenantIncome = profile?.income_monthly != null ? Number(profile.income_monthly) : null;
    }

    let landlordUserId: string | null = null;
    if (property.landlord_id) {
      landlordUserId = await this.resolveLandlordUserId(property.landlord_id);
    }

    return {
      suburb: property.address_suburb,
      city: property.address_city || 'Windhoek',
      property_type: property.property_type,
      bedrooms: unit.bedrooms,
      geo_lat: property.geo_lat,
      geo_lng: property.geo_lng,
      lease_start_date: leaseStart,
      deposit_ratio: depositRatio,
      tenant_income: tenantIncome,
      landlord_user_id: landlordUserId,
    };
  }
}
