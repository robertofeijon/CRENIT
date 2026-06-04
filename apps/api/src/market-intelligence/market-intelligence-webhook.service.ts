import { createHmac, randomBytes } from 'crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { LandlordLicensableNotifyService } from './landlord-licensable-notify.service';
import { MIN_STATISTICAL_SUBURB_SAMPLE } from './market-intelligence.utils';

export type LicensableSuburbEvent = {
  suburb: string;
  city: string;
  transaction_count: number;
  median_rent: number | null;
  on_time_rate: number | null;
};

const MAX_WEBHOOK_ATTEMPTS = 6;

@Injectable()
export class MarketIntelligenceWebhookService {
  private readonly logger = new Logger(MarketIntelligenceWebhookService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly landlordNotify: LandlordLicensableNotifyService,
  ) {}

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

  async listRecentDeliveries(limit = 50, filter: 'all' | 'failed' | 'pending_retry' = 'all') {
    const fetchLimit = filter === 'all' ? limit : Math.min(200, limit * 4);
    let query = this.mi()
      .from('webhook_deliveries')
      .select(
        'id, event_type, payload, response_status, created_at, subscription_id, attempt_count, next_retry_at, last_error',
      )
      .order('created_at', { ascending: false })
      .limit(fetchLimit);
    if (filter === 'pending_retry') {
      query = query.not('next_retry_at', 'is', null);
    }
    const { data, error } = await query;
    if (error) throw error;
    let deliveries = data ?? [];
    if (filter === 'failed') {
      deliveries = deliveries.filter(
        (d: { response_status: number | null }) => d.response_status == null || d.response_status >= 400,
      );
    }
    deliveries = deliveries.slice(0, limit);
    const subIds = [...new Set(deliveries.map((d: { subscription_id: string | null }) => d.subscription_id).filter(Boolean))];
    let subMap = new Map<string, { url: string; client_id: string }>();
    if (subIds.length) {
      const { data: subs } = await this.mi()
        .from('b2b_webhook_subscriptions')
        .select('id, url, client_id')
        .in('id', subIds);
      subMap = new Map((subs ?? []).map((s: { id: string; url: string; client_id: string }) => [s.id, s]));
    }
    const clientIds = [...new Set([...subMap.values()].map((s) => s.client_id))];
    let clientMap = new Map<string, string>();
    if (clientIds.length) {
      const { data: clients } = await this.mi().from('b2b_clients').select('id, name').in('id', clientIds);
      clientMap = new Map((clients ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));
    }
    return deliveries.map((d: any) => {
      const sub = d.subscription_id ? subMap.get(d.subscription_id) : null;
      return {
        id: d.id,
        event_type: d.event_type,
        response_status: d.response_status,
        created_at: d.created_at,
        attempt_count: d.attempt_count ?? 1,
        next_retry_at: d.next_retry_at ?? null,
        last_error: d.last_error ?? null,
        pending_retry: !!d.next_retry_at,
        suburb: (d.payload as { data?: { suburbs?: { suburb: string }[] } })?.data?.suburbs?.[0]?.suburb ?? null,
        url: sub?.url ?? null,
        client_name: sub ? clientMap.get(sub.client_id) ?? null : null,
      };
    });
  }

  async retryPendingDeliveries() {
    const now = new Date().toISOString();
    const { data: pending, error } = await this.mi()
      .from('webhook_deliveries')
      .select('*')
      .not('next_retry_at', 'is', null)
      .lte('next_retry_at', now)
      .lt('attempt_count', MAX_WEBHOOK_ATTEMPTS)
      .order('next_retry_at', { ascending: true })
      .limit(25);
    if (error) {
      this.logger.warn('retryPendingDeliveries query failed', error);
      return { retried: 0, succeeded: 0, exhausted: 0 };
    }
    let succeeded = 0;
    let exhausted = 0;
    for (const row of pending ?? []) {
      const { data: sub } = await this.mi()
        .from('b2b_webhook_subscriptions')
        .select('*')
        .eq('id', row.subscription_id)
        .eq('is_active', true)
        .maybeSingle();
      if (!sub) {
        await this.mi()
          .from('webhook_deliveries')
          .update({ next_retry_at: null, last_error: 'Subscription inactive or removed' })
          .eq('id', row.id);
        exhausted += 1;
        continue;
      }
      const status = await this.redeliverExisting(sub, row);
      if (!this.deliveryNeedsRetry(status)) succeeded += 1;
    }
    return { retried: (pending ?? []).length, succeeded, exhausted };
  }

  private deliveryNeedsRetry(responseStatus: number | null) {
    return responseStatus == null || responseStatus >= 400;
  }

  private nextRetryAt(attemptNumber: number) {
    const delaySec = Math.min(3600, 60 * 2 ** Math.max(0, attemptNumber - 1));
    return new Date(Date.now() + delaySec * 1000).toISOString();
  }

  async sendTestDelivery(subscriptionId: string) {
    const { data: sub, error } = await this.mi()
      .from('b2b_webhook_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    if (!sub) throw new BadRequestException('Active subscription not found');
    const status = await this.deliverToSubscription(sub, 'suburb.licensable', {
      test: true,
      suburbs: [
        {
          suburb: 'Test Suburb',
          city: 'Windhoek',
          transaction_count: 10,
          median_rent: 12000,
          on_time_rate: 92,
        },
      ],
    });
    return { ok: true, subscription_id: subscriptionId, response_status: status };
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
        try {
          await this.landlordNotify.notifyLandlordsForNewlyLicensableSuburbs(newlyLicensable);
        } catch (notifyErr) {
          this.logger.warn('Landlord licensable notifications failed', notifyErr as Error);
        }
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
    for (const sub of matching) {
      await this.deliverToSubscription(sub, eventType, payload);
    }
  }

  private async deliverToSubscription(
    sub: { id: string; url: string; secret: string },
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    const body = JSON.stringify({
      event: eventType,
      occurred_at: new Date().toISOString(),
      data: payload,
    });
    const { responseStatus, lastError } = await this.postWebhook(sub, eventType, body);
    const needsRetry = this.deliveryNeedsRetry(responseStatus);
    try {
      await this.mi().from('webhook_deliveries').insert([
        {
          subscription_id: sub.id,
          event_type: eventType,
          payload: JSON.parse(body),
          response_status: responseStatus,
          attempt_count: 1,
          next_retry_at: needsRetry ? this.nextRetryAt(1) : null,
          last_error: lastError,
        },
      ]);
    } catch {
      /* ignore log failure */
    }
    return responseStatus;
  }

  private async redeliverExisting(
    sub: { id: string; url: string; secret: string },
    delivery: {
      id: string;
      event_type: string;
      payload: Record<string, unknown>;
      attempt_count: number;
    },
  ) {
    const body = JSON.stringify(delivery.payload);
    const { responseStatus, lastError } = await this.postWebhook(sub, delivery.event_type, body);
    const attempt = (delivery.attempt_count ?? 1) + 1;
    const needsRetry = this.deliveryNeedsRetry(responseStatus) && attempt < MAX_WEBHOOK_ATTEMPTS;
    try {
      await this.mi()
        .from('webhook_deliveries')
        .update({
          response_status: responseStatus,
          attempt_count: attempt,
          next_retry_at: needsRetry ? this.nextRetryAt(attempt) : null,
          last_error: lastError,
        })
        .eq('id', delivery.id);
    } catch {
      /* ignore */
    }
    return responseStatus;
  }

  private async postWebhook(sub: { url: string; secret: string }, eventType: string, body: string) {
    const signature = this.signPayload(sub.secret, body);
    let responseStatus: number | null = null;
    let lastError: string | null = null;
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
      if (this.deliveryNeedsRetry(responseStatus)) {
        lastError = `HTTP ${responseStatus}`;
      }
    } catch (err) {
      lastError = (err as Error).message;
      this.logger.warn(`Webhook delivery failed ${sub.url}: ${lastError}`);
    }
    return { responseStatus, lastError };
  }
}
