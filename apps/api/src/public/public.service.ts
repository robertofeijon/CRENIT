import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EmailDeliveryService } from '../notifications/email-delivery.service';
import { MarketIntelligenceService } from '../market-intelligence/market-intelligence.service';
import { B2B_DEMO_DISCLAIMER } from '../market-intelligence/b2b-demo-dataset.constant';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);

  constructor(
    private readonly emailDelivery: EmailDeliveryService,
    private readonly supabase: SupabaseService,
    private readonly marketIntelligence: MarketIntelligenceService,
  ) {}

  async submitContact(payload: { name: string; email: string; subject: string; message: string }) {
    const name = payload.name?.trim();
    const email = payload.email?.trim();
    const subject = payload.subject?.trim();
    const message = payload.message?.trim();

    if (!name || !email || !subject || !message) {
      throw new BadRequestException('name, email, subject, and message are required');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Invalid email address');
    }
    if (message.length > 5000) {
      throw new BadRequestException('Message is too long');
    }

    const to = this.emailDelivery.contactEmail();
    const html = `
      <h2>CRENIT website contact</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <p><strong>Message:</strong></p>
      <pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(message)}</pre>
    `;

    const result = await this.emailDelivery.deliverHtml({
      to,
      subject: `[CRENIT Contact] ${subject}`,
      html,
      replyTo: email,
    });

    if (!result.sent) {
      this.logger.warn(`Contact form stored but email not sent: ${result.error}`);
      return {
        received: true,
        email_sent: false,
        message: 'We received your message. Email delivery is not configured on this environment — the team will follow up when available.',
      };
    }

    return {
      received: true,
      email_sent: true,
      message: 'Thank you — we received your message and will respond shortly.',
    };
  }

  async joinWaitlist(payload: { email: string; full_name?: string; suburb: string }) {
    const email = payload.email?.trim().toLowerCase();
    const suburb = payload.suburb?.trim();
    const fullName = payload.full_name?.trim() || null;

    if (!email || !suburb) {
      throw new BadRequestException('email and suburb are required');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Invalid email address');
    }
    if (suburb.length < 2) {
      throw new BadRequestException('Suburb is required');
    }

    const client = this.supabase.getClient();
    const { data: existing } = await client
      .from('tenant_waitlist')
      .select('id')
      .ilike('email', email)
      .ilike('suburb', suburb)
      .maybeSingle();

    if (existing) {
      return {
        joined: true,
        already_registered: true,
        message: `You are already on the waitlist for ${suburb}. We will email you when a landlord joins.`,
      };
    }

    const { data, error } = await client
      .from('tenant_waitlist')
      .insert([{ email, full_name: fullName, suburb, status: 'WAITING' }])
      .select()
      .single();

    if (error) throw error;

    return {
      joined: true,
      already_registered: false,
      waitlist_id: data?.id,
      message: `You are on the waitlist for ${suburb}. We will notify you when CRENIT landlords are accepting tenants there.`,
    };
  }

  async notifyWaitlistForSuburb(suburb: string) {
    const normalized = suburb?.trim();
    if (!normalized) return { notified: 0 };

    const client = this.supabase.getClient();
    const { data: rows, error } = await client
      .from('tenant_waitlist')
      .select('id, email, full_name')
      .eq('status', 'WAITING')
      .ilike('suburb', normalized);

    if (error || !rows?.length) {
      return { notified: 0 };
    }

    const webUrl = process.env.WEB_URL || process.env.APP_URL || 'http://localhost:3002';
    let notified = 0;

    for (const row of rows) {
      const html = `
        <h2>CRENIT is now in ${normalized}</h2>
        <p>Hi ${row.full_name || 'there'},</p>
        <p>A verified landlord just joined CRENIT in ${normalized}. Ask your landlord to invite you, or explore how rent payments build your credit score.</p>
        <p><a href="${webUrl}/auth">Create your tenant account →</a></p>
      `;
      const result = await this.emailDelivery.deliverHtml({
        to: row.email,
        subject: `CRENIT landlords are now active in ${normalized}`,
        html,
      });
      if (result.sent || !this.emailDelivery.isConfigured()) {
        await client
          .from('tenant_waitlist')
          .update({ status: 'NOTIFIED', notified_at: new Date().toISOString() })
          .eq('id', row.id);
        notified += 1;
      }
    }

    this.logger.log(`Waitlist notified ${notified} tenant(s) for suburb ${normalized}`);
    return { notified };
  }

  async requestB2bSampleKey(payload: { email: string; company_name?: string }) {
    const provisioned = await this.marketIntelligence.provisionB2bSampleKey(payload.email, payload.company_name);
    const apiBase = process.env.API_URL || process.env.APP_URL || 'http://localhost:3001';
    const html = `
      <h2>Your CRENIT Data Intelligence sample API key</h2>
      <p>Use this key for a ${provisioned.expires_in_days}-day evaluation.</p>
      <p><strong>API key:</strong><br/><code>${provisioned.api_key}</code></p>
      <p><strong>Example suburb call:</strong></p>
      <pre>curl -H "X-CRENIT-Key: ${provisioned.api_key}" "${apiBase}/api/v1/suburb/Klein%20Windhoek"</pre>
      <p><strong>Example PDF:</strong></p>
      <pre>curl -H "X-CRENIT-Key: ${provisioned.api_key}" "${apiBase}/api/v1/reports/suburb_report/pdf?suburb=Klein%20Windhoek" -o sample.pdf</pre>
      <p>${B2B_DEMO_DISCLAIMER}</p>
    `;
    const emailResult = await this.emailDelivery.deliverHtml({
      to: provisioned.email,
      subject: 'Your CRENIT Data Intelligence sample API key',
      html,
    });
    return {
      ...provisioned,
      email_sent: emailResult.sent,
      message: emailResult.sent
        ? 'Sample API key sent to your email. It is also shown once below for this session.'
        : 'Sample API key created. Email delivery is not configured — copy the key below.',
    };
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
