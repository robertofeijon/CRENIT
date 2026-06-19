export function landlordEftInitiatedMessage(amount: number, autoConfirmHours: number): string {
  return `A tenant started an EFT payment of N$${amount.toLocaleString()}. You have ${autoConfirmHours}h to review — confirm when it lands in your account.`;
}

export function landlordEftProofUploadedMessage(amount: number, autoConfirmHours: number): string {
  return `Proof received for N$${amount.toLocaleString()}. Review when ready — it will auto-confirm in ${autoConfirmHours}h unless you take no action.`;
}

export function landlordAutoConfirmReminderMessage(amount: number, hoursUntilAuto: number): string {
  const hours = Math.max(1, Math.round(hoursUntilAuto));
  return `Heads-up: N$${amount.toLocaleString()} is scheduled to auto-confirm in about ${hours}h. Review now if you need to dispute.`;
}

export function landlordPendingQueueSummaryMessage(pendingCount: number, soonestHours: number | null): string {
  if (pendingCount <= 0) return '';
  if (soonestHours != null && soonestHours <= 48) {
    return `${pendingCount} payment${pendingCount === 1 ? '' : 's'} will auto-confirm in ${soonestHours}h unless you review them.`;
  }
  return `${pendingCount} payment${pendingCount === 1 ? '' : 's'} in your review queue — confirm when funds arrive.`;
}

export function landlordPartnerBannerConfirmMessage(count: number): string {
  return `${count} payment${count === 1 ? '' : 's'} ready for your review — confirm when funds arrive.`;
}
