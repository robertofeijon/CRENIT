import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export type DeliverHtmlOptions = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

@Injectable()
export class EmailDeliveryService {
  private readonly logger = new Logger(EmailDeliveryService.name);
  private smtpTransporter: Transporter | null = null;

  provider(): string {
    return (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();
  }

  contactEmail(): string {
    return process.env.EMAIL_CONTACT || process.env.EMAIL_REPLY_TO || process.env.SMTP_USER || 'hello@crenit.co';
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

  isConfigured(): boolean {
    const provider = this.provider();
    if (provider === 'smtp') {
      return Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
    }
    const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
    return Boolean(apiKey && apiKey !== 'dev-placeholder');
  }

  async deliverHtml(options: DeliverHtmlOptions): Promise<{ sent: boolean; error?: string }> {
    if (!this.isConfigured()) {
      this.logger.warn(`Email not configured (${this.provider()}). Skipping send to ${options.to}`);
      return { sent: false, error: 'not_configured' };
    }

    const provider = this.provider();
    try {
      if (provider === 'smtp') {
        await this.sendViaSmtp(options);
        return { sent: true };
      }
      if (provider === 'sendgrid') {
        await this.sendViaSendGrid(options);
        return { sent: true };
      }
      if (provider === 'postmark') {
        await this.sendViaPostmark(options);
        return { sent: true };
      }
      await this.sendViaResend(options);
      return { sent: true };
    } catch (error) {
      const message = (error as Error).message || String(error);
      this.logger.warn(`Email delivery failed (${provider} → ${options.to}): ${message}`);
      return { sent: false, error: message };
    }
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
    const from = this.fromAddress();
    const info = await this.getSmtpTransporter().sendMail({
      from,
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
