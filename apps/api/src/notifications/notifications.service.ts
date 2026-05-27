import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { MarketIntelligenceService } from '../market-intelligence/market-intelligence.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly marketIntelligenceService: MarketIntelligenceService,
  ) {}

  async createNotification(payload: {
    user_id: string;
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown> | null;
  }) {
    if (!payload.user_id) return null;
    const client = this.supabase.getClient();
    const now = new Date().toISOString();
    const { data, error } = await client
      .from('notifications')
      .insert([
        {
          user_id: payload.user_id,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          metadata: payload.metadata ?? {},
          read: false,
          created_at: now,
        },
      ])
      .select('*')
      .limit(1);

    if (error) {
      this.logger.warn(`Failed to create notification (${payload.type}): ${error.message}`);
      return null;
    }

    const created = data?.[0] ?? null;
    await this.dispatchExternalNotification(payload.user_id, payload.type, payload.title, payload.message, payload.metadata ?? {});
    return created;
  }

  private resolvePreferenceKey(type: string) {
    if (type.includes('RENT') || type.includes('PAYMENT_OVERDUE')) return 'rent_reminders';
    if (type.includes('PAYMENT') || type.includes('INVITE_ACCEPTED')) return 'payment_confirmations';
    if (type.includes('KYC')) return 'kyc_updates';
    if (type.includes('LEASE') || type.includes('INVITE')) return 'lease_events';
    if (type.includes('DEPOSIT') || type.includes('DISPUTE')) return 'deposit_events';
    return null;
  }

  private getEmailSubjectAndMessage(type: string, title: string, message: string, metadata: Record<string, unknown>) {
    const amount = metadata?.amount ? `N$${Number(metadata.amount).toLocaleString()}` : null;
    switch (type) {
      case 'INVITE_SENT':
        return { subject: 'Your landlord has invited you to RentCredit', body: message };
      case 'INVITE_ACCEPTED':
        return { subject: 'Invitation accepted on RentCredit', body: message };
      case 'RENT_DUE_REMINDER':
        return { subject: `Your rent of ${amount || 'N$0'} is due in 3 days`, body: message };
      case 'PAYMENT_CONFIRMED':
        return { subject: 'Payment confirmed — RentCredit receipt', body: message };
      case 'PAYMENT_OVERDUE':
        return { subject: 'Your rent payment is overdue', body: message };
      case 'KYC_APPROVED':
        return { subject: 'Your identity has been verified — your RentCredit Score is now active', body: message };
      case 'KYC_REJECTED':
        return { subject: 'Action required: your KYC submission needs attention', body: message };
      case 'LEASE_RENEWAL_PROPOSED':
        return { subject: 'Lease renewal proposed', body: message };
      case 'LEASE_RENEWAL_UPDATED':
        return { subject: 'Lease renewal response update', body: message };
      case 'DEPOSIT_RELEASED':
        return { subject: 'Deposit released', body: message };
      case 'DISPUTE_FILED':
        return { subject: 'A dispute has been filed', body: message };
      case 'DISPUTE_RESOLVED':
        return { subject: 'Dispute resolved', body: message };
      default:
        return { subject: title, body: message };
    }
  }

  private async dispatchExternalNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    metadata: Record<string, unknown>,
  ) {
    const client = this.supabase.getClient();
    const [{ data: profile }, { data: prefs }] = await Promise.all([
      client.from('profiles').select('id, full_name, phone').eq('id', userId).maybeSingle(),
      client.from('notification_preferences').select('*').eq('profile_id', userId).maybeSingle(),
    ]);

    const userName = profile?.full_name || 'RentCredit user';
    const preferenceKey = this.resolvePreferenceKey(type);
    const eventAllowed = preferenceKey ? prefs?.[preferenceKey] !== false : true;

    const emailContent = this.getEmailSubjectAndMessage(type, title, message, metadata);
    if (prefs?.email_enabled !== false && eventAllowed) {
      const { data: authUser } = await client.auth.admin.getUserById(userId).catch(() => ({ data: { user: null } as any }));
      const email = authUser?.user?.email ?? null;
      if (email) {
        await this.sendEmail(email, emailContent.subject, emailContent.body, userName);
      }
    }

    if (process.env.SMS_ENABLED === 'true' && prefs?.sms_enabled && eventAllowed && profile?.phone) {
      await this.sendSms(profile.phone, `${emailContent.subject}: ${emailContent.body}`.slice(0, 160));
    }
  }

  private buildEmailHtml(title: string, message: string, name: string) {
    return `
      <div style="font-family:Arial,sans-serif;background:#fff;color:#111;padding:24px;">
        <div style="max-width:640px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden;">
          <div style="background:#C0392B;color:#fff;padding:16px 20px;font-size:20px;font-weight:700;">RentCredit</div>
          <div style="padding:20px;">
            <p style="margin:0 0 12px;">Hi ${name},</p>
            <h2 style="margin:0 0 12px;font-size:20px;">${title}</h2>
            <p style="margin:0 0 16px;line-height:1.5;">${message}</p>
          </div>
          <div style="padding:14px 20px;background:#fafafa;color:#666;font-size:12px;">
            rentcredit.co · hello@rentcredit.co · Windhoek, Namibia
          </div>
        </div>
      </div>
    `;
  }

  private async sendEmail(to: string, subject: string, message: string, name: string) {
    const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
    const provider = (process.env.EMAIL_PROVIDER || 'resend').toLowerCase();
    if (!apiKey) return;

    try {
      const html = this.buildEmailHtml(subject, message, name);
      if (provider === 'sendgrid') {
        await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: 'hello@rentcredit.co', name: 'RentCredit' },
            subject,
            content: [{ type: 'text/html', value: html }],
          }),
        });
        return;
      }
      if (provider === 'postmark') {
        await fetch('https://api.postmarkapp.com/email', {
          method: 'POST',
          headers: { 'X-Postmark-Server-Token': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            From: 'hello@rentcredit.co',
            To: to,
            Subject: subject,
            HtmlBody: html,
          }),
        });
        return;
      }
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'RentCredit <hello@rentcredit.co>',
          to: [to],
          subject,
          html,
        }),
      });
    } catch (error) {
      this.logger.warn(`Email send failed (${subject}): ${(error as Error).message}`);
    }
  }

  private async sendSms(phone: string, text: string) {
    const provider = (process.env.SMS_PROVIDER || 'africas_talking').toLowerCase();
    const apiKey = process.env.SMS_PROVIDER_API_KEY;
    if (!apiKey || provider !== 'africas_talking') return;
    try {
      await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          username: 'sandbox',
          to: phone,
          message: text,
          from: 'RentCredit',
        }),
      });
    } catch (error) {
      this.logger.warn(`SMS send failed: ${(error as Error).message}`);
    }
  }

  async listForUser(userId: string, limit = 25) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  async listUnreadForUser(userId: string, limit = 10) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  async markRead(userId: string, notificationId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async markAllRead(userId: string) {
    const client = this.supabase.getClient();
    const { error } = await client.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
    if (error) throw error;
    return { updated: true };
  }

  private async hasRecentTypeNotification(userId: string, type: string, daysBack: number) {
    const client = this.supabase.getClient();
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await client
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('type', type)
      .gte('created_at', since)
      .limit(1);
    if (error) return false;
    return Boolean(data?.length);
  }

  async sendRentDueReminders(daysBefore = 3) {
    const client = this.supabase.getClient();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysBefore);
    const dueDate = targetDate.toISOString().slice(0, 10);

    const { data: payments, error } = await client
      .from('payments')
      .select('id, tenant_id, due_date, amount_gross, status')
      .in('status', ['PENDING', 'PROCESSING'])
      .eq('due_date', dueDate);
    if (error) throw error;

    for (const payment of payments || []) {
      if (!payment.tenant_id) continue;
      const alreadySent = await this.hasRecentTypeNotification(payment.tenant_id, 'RENT_DUE_REMINDER', 2);
      if (alreadySent) continue;
      await this.createNotification({
        user_id: payment.tenant_id,
        type: 'RENT_DUE_REMINDER',
        title: 'Rent due reminder',
        message: `Rent payment of N$${Number(payment.amount_gross || 0).toLocaleString()} is due on ${payment.due_date}.`,
        metadata: { payment_id: payment.id, due_date: payment.due_date },
      });
    }
  }

  async sendKycLifecycleReminders() {
    const client = this.supabase.getClient();
    const { data: profiles, error } = await client
      .from('profiles')
      .select('id, kyc_status, kyc_approved_at')
      .in('kyc_status', ['APPROVED', 'VERIFIED'])
      .not('kyc_approved_at', 'is', null);
    if (error) throw error;

    const now = Date.now();
    for (const profile of profiles || []) {
      if (!profile.kyc_approved_at) continue;
      const approvedAtMs = new Date(profile.kyc_approved_at).getTime();
      const ageDays = Math.floor((now - approvedAtMs) / (24 * 60 * 60 * 1000));
      if (ageDays >= 335 && ageDays < 365) {
        const sent = await this.hasRecentTypeNotification(profile.id, 'KYC_EXPIRING', 30);
        if (!sent) {
          await this.createNotification({
            user_id: profile.id,
            type: 'KYC_EXPIRING',
            title: 'KYC expiring soon',
            message: 'Your KYC verification is nearing expiry. Please resubmit documents to avoid restrictions.',
            metadata: { age_days: ageDays },
          });
        }
      }
      if (ageDays >= 365) {
        const sent = await this.hasRecentTypeNotification(profile.id, 'KYC_EXPIRED', 30);
        if (!sent) {
          await this.createNotification({
            user_id: profile.id,
            type: 'KYC_EXPIRED',
            title: 'KYC expired',
            message: 'Your KYC verification has expired. Please update your KYC details.',
            metadata: { age_days: ageDays },
          });
        }
      }
    }
  }

  async generateLeaseRenewalProposals() {
    const client = this.supabase.getClient();
    const today = new Date();
    const endWindow = new Date();
    endWindow.setDate(endWindow.getDate() + 45);
    const startDate = today.toISOString().slice(0, 10);
    const endDate = endWindow.toISOString().slice(0, 10);

    const { data: leases, error } = await client
      .from('leases')
      .select('id, tenant_id, landlord_id, end_date, unit_id, monthly_rent, status')
      .eq('status', 'ACTIVE')
      .not('end_date', 'is', null)
      .gte('end_date', startDate)
      .lte('end_date', endDate);
    if (error) throw error;

    for (const lease of leases || []) {
      const { data: existing } = await client
        .from('lease_renewals')
        .select('id')
        .eq('lease_id', lease.id)
        .in('status', ['PROPOSED', 'PENDING_APPROVAL', 'APPROVED'])
        .limit(1);
      if (existing?.length) continue;

      const currentEnd = new Date(lease.end_date);
      const proposedEnd = new Date(currentEnd);
      proposedEnd.setFullYear(proposedEnd.getFullYear() + 1);

      const { data: created, error: createErr } = await client
        .from('lease_renewals')
        .insert([
          {
            lease_id: lease.id,
            tenant_id: lease.tenant_id,
            landlord_id: lease.landlord_id,
            current_end_date: lease.end_date,
            proposed_end_date: proposedEnd.toISOString().slice(0, 10),
            proposed_rent: lease.monthly_rent,
            status: 'PROPOSED',
            generated_at: new Date().toISOString(),
          },
        ])
        .select('*')
        .single();
      if (createErr) {
        this.logger.warn(`Unable to create lease renewal proposal for lease ${lease.id}: ${createErr.message}`);
        continue;
      }

      if (lease.tenant_id) {
        await this.createNotification({
          user_id: lease.tenant_id,
          type: 'LEASE_RENEWAL_PROPOSED',
          title: 'Lease renewal proposed',
          message: 'A lease renewal proposal is available for your review.',
          metadata: { lease_id: lease.id, renewal_id: created.id, current_end_date: lease.end_date },
        });
      }

      if (lease.landlord_id) {
        const { data: landlord } = await client
          .from('landlord_profiles')
          .select('user_id')
          .eq('id', lease.landlord_id)
          .maybeSingle();
        if (landlord?.user_id) {
          await this.createNotification({
            user_id: landlord.user_id,
            type: 'LEASE_RENEWAL_PROPOSED',
            title: 'Lease renewal draft generated',
            message: 'A renewal proposal draft was generated for an expiring lease.',
            metadata: { lease_id: lease.id, renewal_id: created.id, current_end_date: lease.end_date },
          });
        }
      }
    }
  }

  async sendApiKeyExpiryAlerts() {
    const expiring = await this.marketIntelligenceService.findKeysExpiringWithin(7);
    if (!expiring.length) return;
    const client = this.supabase.getClient();
    const { data: admins } = await client.from('profiles').select('id').eq('role', 'ADMIN');
    for (const admin of admins || []) {
      await this.createNotification({
        user_id: admin.id,
        type: 'API_KEY_EXPIRING',
        title: 'B2B API keys expiring soon',
        message: `${expiring.length} API key(s) expire within 7 days. Review key rotation in Data Intelligence.`,
        metadata: { expiring_keys: expiring.length },
      });
    }
  }
}
