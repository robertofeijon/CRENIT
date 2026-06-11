import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EmailDeliveryService } from '../notifications/email-delivery.service';

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);

  constructor(private readonly emailDelivery: EmailDeliveryService) {}

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
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
