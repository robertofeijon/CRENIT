export const DISPUTE_TYPES = ['DAMAGE_CLAIM', 'UNPAID_UTILITIES', 'EARLY_EXIT', 'OTHER'] as const;
export type DisputeType = (typeof DISPUTE_TYPES)[number];

export const DISPUTE_TEMPLATES: Record<
  DisputeType,
  { label: string; description: string; checklist: string[]; eta_days: number }
> = {
  DAMAGE_CLAIM: {
    label: 'Property damage',
    description: 'Claim for repair costs beyond normal wear and tear.',
    checklist: ['Photos of damage', 'Repair quote or invoice', 'Move-in condition reference if available'],
    eta_days: 14,
  },
  UNPAID_UTILITIES: {
    label: 'Unpaid utilities',
    description: 'Outstanding water, electricity, or municipal charges.',
    checklist: ['Utility account statement', 'Final meter reading', 'Lease utility clause reference'],
    eta_days: 10,
  },
  EARLY_EXIT: {
    label: 'Early lease exit',
    description: 'Deposit adjustment for breaking lease terms early.',
    checklist: ['Notice letter dates', 'Re-letting evidence', 'Outstanding rent summary'],
    eta_days: 21,
  },
  OTHER: {
    label: 'Other',
    description: 'Other deposit disagreement — provide full context.',
    checklist: ['Written explanation', 'Supporting documents', 'Proposed settlement amount'],
    eta_days: 14,
  },
};
