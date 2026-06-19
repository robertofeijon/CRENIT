import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { SupabaseService } from '../supabase/supabase.service';
import {
  emailStatusAfterFailure,
  nextEmailRetryAt,
  validateEmailConfiguration,
  type EmailConfigIssue,
} from './email-retry.util';

export type DeliverHtmlOptions = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  metadata?: Record<string, unknown>;
  skipQueue?: boolean;
};

export type EmailDeliveryResult = {
  sent: boolean;
  error?: string;
  log_id?: string;
  queued_for_retry?: boolean;
};

export type EmailHealthSnapshot = {
  configured: boolean;
  provider: string;
  issues: EmailConfigIssue[];
  pending_retries: number;
  failed_24h: number;
  dead_24h: number;
  last_sent_at: string | null;
};

@Injectable()
export class EmailDeliveryService implements OnModuleInit {
  private readonly logger = new Logger(EmailDeliveryService.name);
  private smtpTransporter: Transporter | null = null;
  private startupValidated = false;

  constructor(private readonly supabase: SupabaseService) {}

  onModuleInit() {
    const health = this.getConfigurationHealth();
    this.startupValidated = true;
    if (!health.configured) {
      this.logger.error(
        `EMAIL MISCONFIGURED — transactional email will queue/fail until fixed: ${health.issues
          .filter((i) => i.severity === 'critical')
          .map((i) => i.code)
          .join(', ')}`,
      );
      health.issues.forEach((issue) => {
        const logFn = issue.severity === 'critical' ? this.logger.error.bind(this.logger) : this.logger.warn.bind(this.logger);
        logFn(`[email-config] ${issue.code}: ${issue.message}`);
      });
    } else {
      this.logger.log(`Email delivery ready (${health.provider})`);
    }
  }

  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  provider(): string {
    return (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();
  }

  contactEmail(): string {
    return process.env.EMAIL_CONTACT || process.env.EMAIL_REPLY_TO || process.env.SMTP_USER || 'robertofeijon@gmail.com';
  }

  fromAddress(): string {
    if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
    if (this.provider() === 'smtp') {
      const user = process.env.SMTP_USER || this.contactEmail();
      return `CRENIT <${user}>`;
    }
    return 'CRENIT <onboarding@resend.dev>';
  }

  replyToAddress(): string {
    return process.env.EMAIL_REPLY_TO || this.contactEmail();
  }

  getConfigurationHealth() {
    return validateEmailConfiguration(process.env);
  }

  isConfigured(): boolean {
    return this.getConfigurationHealth().configured;
  }

  async getHealthSnapshot(): Promise<EmailHealthSnapshot> {
    const base = this.getConfigurationHealth();
    const client = this.supabase.getClient();
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const [pendingRes, failedRes, deadRes, lastSentRes] = await Promise.all([
      client
        .from('email_delivery_log')
        .select('id', { count: 'exact', head: true })
        .in('status', ['PENDING', 'FAILED']),
      client
        .from('email_delivery_log')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'FAILED')
        .gte('updated_at', since),
      client
        .from('email_delivery_log')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'DEAD')
        .gte('updated_at', since),
      client
        .from('email_delivery_log')
        .select('sent_at')
        .eq('status', 'SENT')
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return {
      ...base,
      pending_retries: pendingRes.count ?? 0,
      failed_24h: failedRes.count ?? 0,
      dead_24h: deadRes.count ?? 0,
      last_sent_at: lastSentRes.data?.sent_at ?? null,
    };
  }

  async deliverHtml(options: DeliverHtmlOptions): Promise<EmailDeliveryResult> {
    const logId = await this.createLogRow(options);

    if (!this.isConfigured()) {
      const error = 'email_not_configured';
      await this.markFailed(logId, error, 1, false);
      this.logger.error(`Email NOT SENT (misconfigured) → ${options.to} | subject: ${options.subject} | log: ${logId}`);
      return { sent: false, error, log_id: logId, queued_for_retry: false };
    }

    const provider = this.provider();
    if (!this.isProduction() && provider !== 'smtp') {
      const error = 'dev_mode_skipped';
      await this.markFailed(logId, error, 1, false);
      this.logger.warn(`Email skipped in dev (${provider}) → ${options.to} | log: ${logId}`);
      return { sent: false, error, log_id: logId, queued_for_retry: false };
    }

    try {
      await this.sendNow(options);
      await this.markSent(logId);
      return { sent: true, log_id: logId };
    } catch (error) {
      const message = (error as Error).message || String(error);
      const queued = await this.markFailed(logId, message, 1, !options.skipQueue);
      this.logger.error(`Email delivery FAILED → ${options.to} | ${message} | log: ${logId} | retry: ${queued}`);
      return { sent: false, error: message, log_id: logId, queued_for_retry: queued };
    }
  }

  /** Admin smoke test — always attempts real send when configured; never silent. */
  async sendSmokeTest(to: string): Promise<EmailDeliveryResult & { configured: boolean; provider: string }> {
    const health = this.getConfigurationHealth();
    const html = `
      <h2>CRENIT email smoke test</h2>
      <p>Provider: <strong>${health.provider}</strong></p>
      <p>Timestamp: ${new Date().toISOString()}</p>
      <p>If you received this, transactional email is working.</p>
    `;
    const result = await this.deliverHtml({
      to,
      subject: 'CRENIT email smoke test',
      html,
      metadata: { kind: 'smoke_test' },
      skipQueue: false,
    });
    return { ...result, configured: health.configured, provider: health.provider };
  }

  async listFailedDeliveries(limit = 50) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('email_delivery_log')
      .select('id, to_address, subject, status, attempt_count, max_attempts, last_error, next_retry_at, created_at, updated_at, sent_at')
      .in('status', ['FAILED', 'DEAD', 'PENDING'])
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processRetryQueue() {
    if (!this.isConfigured()) return;

    const client = this.supabase.getClient();
    const now = new Date().toISOString();
    const { data: rows, error } = await client
      .from('email_delivery_log')
      .select('*')
      .in('status', ['PENDING', 'FAILED'])
      .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
      .order('created_at', { ascending: true })
      .limit(20);

    if (error || !rows?.length) return;

    for (const row of rows) {
      if (row.attempt_count > 0 && row.next_retry_at && new Date(row.next_retry_at).getTime() > Date.now()) {
        continue;
      }
      const attempt = Number(row.attempt_count || 0) + 1;
      try {
        await this.sendNow({
          to: row.to_address,
          subject: row.subject,
          html: row.html_body,
          replyTo: row.reply_to || undefined,
        });
        await client
          .from('email_delivery_log')
          .update({
            status: 'SENT',
            sent_at: new Date().toISOString(),
            attempt_count: attempt,
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id);
        this.logger.log(`Email retry SENT → ${row.to_address} (log ${row.id}, attempt ${attempt})`);
      } catch (err) {
        const message = (err as Error).message || String(err);
        const maxAttempts = Number(row.max_attempts || 5);
        const status = emailStatusAfterFailure(attempt, maxAttempts);
        const retryAt = status === 'FAILED' ? nextEmailRetryAt(attempt) : null;
        await client
          .from('email_delivery_log')
          .update({
            status,
            attempt_count: attempt,
            last_error: message,
            next_retry_at: retryAt?.toISOString() ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id);
        this.logger.warn(`Email retry FAILED → ${row.to_address} (log ${row.id}, attempt ${attempt}): ${message}`);
      }
    }
  }

  private async createLogRow(options: DeliverHtmlOptions): Promise<string> {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('email_delivery_log')
      .insert([
        {
          to_address: options.to,
          subject: options.subject,
          html_body: options.html,
          reply_to: options.replyTo || null,
          provider: this.provider(),
          status: 'PENDING',
          attempt_count: 0,
          metadata: options.metadata || {},
          next_retry_at: new Date().toISOString(),
        },
      ])
      .select('id')
      .single();
    if (error || !data?.id) {
      this.logger.error(`Failed to create email_delivery_log row: ${error?.message}`);
      return 'unknown';
    }
    return data.id;
  }

  private async markSent(logId: string) {
    if (logId === 'unknown') return;
    const client = this.supabase.getClient();
    await client
      .from('email_delivery_log')
      .update({
        status: 'SENT',
        sent_at: new Date().toISOString(),
        attempt_count: 1,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', logId);
  }

  private async markFailed(logId: string, error: string, attempt: number, scheduleRetry: boolean): Promise<boolean> {
    if (logId === 'unknown') return false;
    const client = this.supabase.getClient();
    const maxAttempts = 5;
    const status = scheduleRetry ? emailStatusAfterFailure(attempt, maxAttempts) : 'DEAD';
    const retryAt = status === 'FAILED' && scheduleRetry ? nextEmailRetryAt(attempt) : null;
    await client
      .from('email_delivery_log')
      .update({
        status,
        attempt_count: attempt,
        last_error: error,
        next_retry_at: retryAt?.toISOString() ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', logId);
    return status === 'FAILED';
  }

  private async sendNow(options: DeliverHtmlOptions) {
    const provider = this.provider();
    if (provider === 'smtp') {
      await this.sendViaSmtp(options);
      return;
    }
    if (provider === 'sendgrid') {
      await this.sendViaSendGrid(options);
      return;
    }
    if (provider === 'postmark') {
      await this.sendViaPostmark(options);
      return;
    }
    await this.sendViaResend(options);
  }

  private getSmtpTransporter(): Transporter {
    if (!this.smtpTransporter) {
      const port = Number(process.env.SMTP_PORT || 587);
      const secure = process.env.SMTP_SECURE === 'true' || port === 465;
      this.smtpTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port,
        secure,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
    return this.smtpTransporter;
  }

  private async sendViaSmtp(options: DeliverHtmlOptions) {
    const info = await this.getSmtpTransporter().sendMail({
      from: this.fromAddress(),
      to: options.to,
      replyTo: options.replyTo || this.replyToAddress(),
      subject: options.subject,
      html: options.html,
    });
    this.logger.log(`SMTP sent to ${options.to} (messageId: ${info.messageId || 'ok'})`);
  }

  private async sendViaResend(options: DeliverHtmlOptions) {
    const apiKey = process.env.EMAIL_PROVIDER_API_KEY!;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        from: this.fromAddress(),
        reply_to: options.replyTo || this.replyToAddress(),
        to: [options.to],
        subject: options.subject,
        html: options.html,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`Resend ${res.status}: ${JSON.stringify(body)}`);
    }
  }

  private async sendViaSendGrid(options: DeliverHtmlOptions) {
    const apiKey = process.env.EMAIL_PROVIDER_API_KEY!;
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        personalizations: [{ to: [{ email: options.to }] }],
        from: { email: this.contactEmail(), name: 'CRENIT' },
        subject: options.subject,
        content: [{ type: 'text/html', value: options.html }],
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`SendGrid ${res.status}: ${text}`);
    }
  }

  private async sendViaPostmark(options: DeliverHtmlOptions) {
    const apiKey = process.env.EMAIL_PROVIDER_API_KEY!;
    const res = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: { 'X-Postmark-Server-Token': apiKey, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        From: this.contactEmail(),
        To: options.to,
        Subject: options.subject,
        HtmlBody: options.html,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Postmark ${res.status}: ${text}`);
    }
  }
}
