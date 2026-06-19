import { describe, expect, it } from 'vitest';
import {
  landlordAutoConfirmReminderMessage,
  landlordEftInitiatedMessage,
  landlordPendingQueueSummaryMessage,
} from './landlord-confirmation-copy.util';

describe('landlord-confirmation-copy.util', () => {
  it('uses helpful countdown language for EFT initiated', () => {
    const msg = landlordEftInitiatedMessage(8500, 48);
    expect(msg).toContain('48h to review');
    expect(msg).not.toMatch(/dispute within/i);
  });

  it('uses countdown for auto-confirm reminder', () => {
    const msg = landlordAutoConfirmReminderMessage(8500, 14);
    expect(msg).toContain('14h');
    expect(msg).toContain('scheduled to auto-confirm');
  });

  it('builds batch queue summary', () => {
    expect(landlordPendingQueueSummaryMessage(3, 14)).toContain('3 payments will auto-confirm in 14h');
  });
});
