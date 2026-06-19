import { Injectable, Logger } from '@nestjs/common';
import { EmailDeliveryService } from './email-delivery.service';
import { sequenceForRole, type OnboardingEmailStep } from './onboarding-email-sequences.constant';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class OnboardingEmailService {
  private readonly logger = new Logger(OnboardingEmailService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly emailDelivery: EmailDeliveryService,
  ) {}

  async enrollUser(userId: string, role: 'TENANT' | 'LANDLORD') {
    const client = this.supabase.getClient();
    const sequence = sequenceForRole(role);
    if (!sequence.length) return;

    const enrolledAt = new Date();
    const nextSendAt = this.nextSendAt(enrolledAt, sequence[0].day_offset);

    const { error } = await client.from('onboarding_email_enrollments').upsert(
      [
        {
          user_id: userId,
          role,
          sequence_key: role === 'LANDLORD' ? 'landlord_v1' : 'tenant_v1',
          next_step_index: 0,
          next_send_at: nextSendAt.toISOString(),
          completed_at: null,
          opted_out_at: null,
        },
      ],
      { onConflict: 'user_id', ignoreDuplicates: true },
    );

    if (error?.code !== '42P01') {
      if (error) this.logger.warn(`Onboarding enroll failed for ${userId}: ${error.message}`);
    }
  }

  async processDueEnrollments(limit = 50) {
    const client = this.supabase.getClient();
    const now = new Date().toISOString();

    const { data: enrollments, error } = await client
      .from('onboarding_email_enrollments')
      .select('id, user_id, role, sequence_key, next_step_index, next_send_at, created_at')
      .is('completed_at', null)
      .is('opted_out_at', null)
      .lte('next_send_at', now)
      .order('next_send_at', { ascending: true })
      .limit(limit);

    if (error) {
      if (error.code === '42P01') return { processed: 0, sent: 0 };
      throw error;
    }

    let sent = 0;
    for (const enrollment of enrollments || []) {
      const didSend = await this.sendNextStep(enrollment);
      if (didSend) sent += 1;
    }

    return { processed: enrollments?.length || 0, sent };
  }

  private async sendNextStep(enrollment: {
    id: string;
    user_id: string;
    role: string;
    next_step_index: number;
    created_at: string;
  }): Promise<boolean> {
    const client = this.supabase.getClient();
    const role = enrollment.role === 'LANDLORD' ? 'LANDLORD' : 'TENANT';
    const sequence = sequenceForRole(role);
    const stepIndex = enrollment.next_step_index;

    if (stepIndex >= sequence.length) {
      await client
        .from('onboarding_email_enrollments')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', enrollment.id);
      return false;
    }

    const step = sequence[stepIndex];
    const email = await this.resolveUserEmail(enrollment.user_id);
    if (!email) {
      await client
        .from('onboarding_email_enrollments')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', enrollment.id);
      return false;
    }

    const prefs = await client
      .from('notification_preferences')
      .select('email_enabled')
      .eq('profile_id', enrollment.user_id)
      .maybeSingle();

    if (prefs.data?.email_enabled === false) {
      await client
        .from('onboarding_email_enrollments')
        .update({ opted_out_at: new Date().toISOString() })
        .eq('id', enrollment.id);
      return false;
    }

    const webUrl = process.env.WEB_URL || process.env.APP_URL || 'http://localhost:3002';
    const html = this.buildHtml(step, webUrl, role);
    const result = await this.emailDelivery.deliverHtml({
      to: email,
      subject: step.subject,
      html,
      metadata: { kind: 'onboarding_sequence', step: stepIndex, role },
    });

    if (!result.sent && this.emailDelivery.isConfigured()) {
      return false;
    }

    const enrolledAt = new Date(enrollment.created_at);
    const nextIndex = stepIndex + 1;
    const nextStep = sequence[nextIndex];
    const updatePayload = nextStep
      ? {
          next_step_index: nextIndex,
          next_send_at: this.nextSendAt(enrolledAt, nextStep.day_offset).toISOString(),
        }
      : { next_step_index: nextIndex, completed_at: new Date().toISOString() };

    await client.from('onboarding_email_enrollments').update(updatePayload).eq('id', enrollment.id);
    return true;
  }

  private nextSendAt(enrolledAt: Date, dayOffset: number): Date {
    const sendAt = new Date(enrolledAt);
    sendAt.setDate(sendAt.getDate() + dayOffset);
    sendAt.setHours(9, 0, 0, 0);
    return sendAt;
  }

  private buildHtml(step: OnboardingEmailStep, webUrl: string, role: 'TENANT' | 'LANDLORD'): string {
    const cta =
      role === 'LANDLORD'
        ? `<p><a href="${webUrl}/landlord/overview">Open landlord dashboard →</a></p>`
        : `<p><a href="${webUrl}/tenant/home">Open tenant home →</a></p>`;
    return `
      <h2>${step.headline}</h2>
      <p>${step.body}</p>
      ${cta}
      <p style="font-size:12px;color:#666;">Educational email from CRENIT onboarding. Manage notification preferences in Settings.</p>
    `;
  }

  private async resolveUserEmail(userId: string): Promise<string | null> {
    const adminApi = this.supabase.getClient().auth.admin as { getUserById?: (id: string) => Promise<{ data?: { user?: { email?: string } } }> };
    if (typeof adminApi.getUserById !== 'function') return null;
    const result = await adminApi.getUserById(userId).catch(() => null);
    return result?.data?.user?.email?.trim().toLowerCase() || null;
  }
}
