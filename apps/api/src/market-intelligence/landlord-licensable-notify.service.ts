import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { EmailDeliveryService } from '../notifications/email-delivery.service';
import { ConsentService } from './consent.service';
import type { LicensableSuburbEvent } from './market-intelligence-webhook.service';

@Injectable()
export class LandlordLicensableNotifyService {
  private readonly logger = new Logger(LandlordLicensableNotifyService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly emailDelivery: EmailDeliveryService,
    private readonly consentService: ConsentService,
  ) {}

  private mi() {
    return this.supabase.getClient().schema('market_intelligence');
  }

  private appBaseUrl() {
    return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  }

  async notifyLandlordsForNewlyLicensableSuburbs(suburbs: LicensableSuburbEvent[]) {
    if (!suburbs?.length) return { emailed: 0, skipped: 0, in_app: 0 };

    const client = this.supabase.getClient();
    let emailed = 0;
    let skipped = 0;
    let inApp = 0;

    for (const ev of suburbs) {
      const { data: properties } = await client
        .from('properties')
        .select('id, property_name, landlord_id, address_suburb, address_city')
        .ilike('address_suburb', ev.suburb)
        .eq('address_city', ev.city || 'Windhoek');

      const byLandlord = new Map<string, { names: string[]; userId: string | null }>();
      for (const p of properties ?? []) {
        if (!p.landlord_id) continue;
        const entry = byLandlord.get(p.landlord_id) ?? { names: [], userId: null };
        entry.names.push(p.property_name || 'Property');
        byLandlord.set(p.landlord_id, entry);
      }

      for (const [landlordProfileId, meta] of byLandlord) {
        const { data: landlord } = await client
          .from('landlord_profiles')
          .select('id, user_id, business_name')
          .eq('id', landlordProfileId)
          .maybeSingle();
        if (!landlord?.user_id) {
          skipped += 1;
          continue;
        }

        const hasConsent = await this.consentService.hasConsent(landlord.user_id, 'LANDLORD_MARKET_DATA');
        if (!hasConsent) {
          skipped += 1;
          continue;
        }

        const { data: prefs } = await client
          .from('notification_preferences')
          .select('email_enabled, market_intelligence_alerts')
          .eq('profile_id', landlord.user_id)
          .maybeSingle();
        if (prefs?.market_intelligence_alerts === false) {
          skipped += 1;
          continue;
        }
        const emailAllowed = prefs?.email_enabled !== false;

        const { data: already } = await this.mi()
          .from('landlord_licensable_notify_log')
          .select('landlord_user_id')
          .eq('landlord_user_id', landlord.user_id)
          .eq('suburb', ev.suburb)
          .eq('city', ev.city)
          .maybeSingle();
        if (already) {
          skipped += 1;
          continue;
        }

        const { data: authUser } = await client.auth.admin.getUserById(landlord.user_id);
        const email = authUser?.user?.email;
        const name = landlord.business_name || email?.split('@')[0] || 'Partner';
        const median =
          ev.median_rent != null ? `N$${Math.round(ev.median_rent).toLocaleString()}` : 'available in portal';
        const title = `${ev.suburb} is now licensable for market intelligence`;
        const message = `${ev.suburb} crossed ${ev.transaction_count} verified payment samples. Median rent ${median}. Your portfolio in this suburb can use B2B-grade benchmarks.`;
        const marketUrl = `${this.appBaseUrl()}/landlord/market-data`;

        await client.from('notifications').insert([
          {
            user_id: landlord.user_id,
            type: 'MARKET_SUBURB_LICENSABLE',
            title,
            message,
            metadata: {
              suburb: ev.suburb,
              city: ev.city,
              transaction_count: ev.transaction_count,
              median_rent: ev.median_rent,
            },
            read: false,
          },
        ]);
        inApp += 1;

        if (email && emailAllowed) {
          const html = `
            <p>Hi ${name},</p>
            <p><strong>${ev.suburb}</strong> (${ev.city}) now has <strong>${ev.transaction_count}</strong> verified CRENIT payment samples and is <strong>commercially licensable</strong> for market intelligence.</p>
            <p>Median verified rent: <strong>${median}</strong>.</p>
            <p>Properties in this area: ${meta.names.slice(0, 3).join(', ')}${meta.names.length > 3 ? ` (+${meta.names.length - 3} more)` : ''}.</p>
            <p><a href="${marketUrl}">Open Market intelligence</a> to compare your units and explore suburb benchmarks.</p>
            <p style="color:#64748b;font-size:12px;">CRENIT · Windhoek, Namibia</p>
          `;
          const result = await this.emailDelivery.deliverHtml({
            to: email,
            subject: `Market intelligence ready — ${ev.suburb}`,
            html,
          });
          if (result.sent) emailed += 1;
        }

        await this.mi().from('landlord_licensable_notify_log').insert([
          { landlord_user_id: landlord.user_id, suburb: ev.suburb, city: ev.city },
        ]);
      }
    }

    this.logger.log(`Licensable landlord notify: ${emailed} emails, ${inApp} in-app, ${skipped} skipped`);
    return { emailed, skipped, in_app: inApp };
  }
}
