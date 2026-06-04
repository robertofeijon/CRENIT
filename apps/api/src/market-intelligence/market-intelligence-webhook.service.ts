import { createHmac, randomBytes } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { MIN_STATISTICAL_SUBURB_SAMPLE } from './market-intelligence.utils';

export type LicensableSuburbEvent = {
  suburb: string;
  city: string;
  transaction_count: number;
  median_rent: number | null;
  on_time_rate: number | null;
};

@Injectable()
export class MarketIntelligenceWebhookService {
  private readonly logger = new Logger(MarketIntelligenceWebhookService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private mi() {
    return this.supabase.getClient().schema('market_intelligence');
  }

  generateWebhookSecret() {
    return randomBytes(24).toString('hex');
  }

  signPayload(secret: string, body: string) {
    return createHmac('sha256', secret).update(body).digest('hex');
  }

  async listWebhooksForClient(clientId: string) {
    const { data, error } = await this.mi()
      .from('b2b_webhook_subscriptions')
      .select('id, client_id, url, events, is_active, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async registerWebhook(clientId: string, url: string, events: string[] = ['suburb.licensable']) {
    const secret = this.generateWebhookSecret();
    const { data, error } = await this.mi()
      .from('b2b_webhook_subscriptions')
      .insert([{ client_id: clientId, url, secret, events, is_active: true }])
      .select('id, client_id, url, events, is_active, created_at')
      .single();
    if (error) throw error;
    return { subscription: data, secret };
  }

  async deactivateWebhook(subscriptionId: string, clientId: string) {
    const { error } = await this.mi()
      .from('b2b_webhook_subscriptions')
      .update({ is_active: false })
      .eq('id', subscriptionId)
      .eq('client_id', clientId);
    if (error) throw error;
    return { ok: true };
  }

  /**
   * Compare explorer licensable suburbs to watch table; fire webhooks on 0→1 transitions.
   */
  async syncLicensableSuburbWatchAndNotify(
    licensableSuburbs: Array<{
      suburb: string;
      city?: string;
      transaction_count: number;
      median_rent?: number;
      on_time_rate?: number;
      commercially_licensable?: boolean;
    }>,
  ) {
    const newlyLicensable: LicensableSuburbEvent[] = [];

    try {
      const { data: existing } = await this.mi().from('licensable_suburb_watch').select('*');
      const prevMap = new Map(
        (existing ?? []).map((r: { suburb: string; city: string; commercially_licensable: boolean }) => [
          `${r.suburb.toLowerCase()}::${(r.city || 'Windhoek').toLowerCase()}`,
          r.commercially_licensable,
        ]),
      );

      const now = new Date().toISOString();
      const rows = licensableSuburbs.map((s) => {
        const city = s.city || 'Windhoek';
        const key = `${s.suburb.toLowerCase()}::${city.toLowerCase()}`;
        const isLicensable =
          s.commercially_licensable ?? s.transaction_count >= MIN_STATISTICAL_SUBURB_SAMPLE;
        const was = prevMap.get(key) ?? false;
        if (isLicensable && !was) {
          newlyLicensable.push({
            suburb: s.suburb,
            city,
            transaction_count: s.transaction_count,
            median_rent: s.median_rent ?? null,
            on_time_rate: s.on_time_rate ?? null,
          });
        }
        return {
          suburb: s.suburb,
          city,
          commercially_licensable: isLicensable,
          transaction_count: s.transaction_count,
          median_rent: s.median_rent ?? null,
          updated_at: now,
        };
      });

      if (rows.length) {
        await this.mi().from('licensable_suburb_watch').upsert(rows, { onConflict: 'suburb,city' });
      }

      if (newlyLicensable.length) {
        await this.dispatchEvent('suburb.licensable', { suburbs: newlyLicensable });
      }

      return { synced: rows.length, newly_licensable: newlyLicensable.length, suburbs: newlyLicensable };
    } catch (err) {
      this.logger.warn('syncLicensableSuburbWatch failed (tables may be missing)', err);
      return { synced: 0, newly_licensable: 0, suburbs: [] as LicensableSuburbEvent[] };
    }
  }

  private async dispatchEvent(eventType: string, payload: Record<string, unknown>) {
    const { data: subs } = await this.mi()
      .from('b2b_webhook_subscriptions')
      .select('*')
      .eq('is_active', true);
    const matching = (subs ?? []).filter((s: { events: string[] }) => (s.events ?? []).includes(eventType));
    const body = JSON.stringify({
      event: eventType,
      occurred_at: new Date().toISOString(),
      data: payload,
    });

    for (const sub of matching) {
      const signature = this.signPayload(sub.secret, body);
      let responseStatus: number | null = null;
      try {
        const res = await fetch(sub.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CRENIT-Event': eventType,
            'X-CRENIT-Signature': `sha256=${signature}`,
          },
          body,
          signal: AbortSignal.timeout(15000),
        });
        responseStatus = res.status;
      } catch (err) {
        this.logger.warn(`Webhook delivery failed ${sub.url}: ${(err as Error).message}`);
      }
      try {
        await this.mi().from('webhook_deliveries').insert([
          {
            subscription_id: sub.id,
            event_type: eventType,
            payload: JSON.parse(body),
            response_status: responseStatus,
          },
        ]);
      } catch {
        /* ignore log failure */
      }
    }
  }
}
