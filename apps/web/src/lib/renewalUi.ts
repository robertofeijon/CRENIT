export type RenewalProposal = {
  id: string;
  lease_id?: string;
  current_end_date?: string;
  proposed_end_date?: string;
  proposed_rent?: number | string;
  status: string;
};

export function formatRenewalDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export function renewalStatusLabel(status: string) {
  switch (status) {
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Declined';
    case 'PENDING_APPROVAL':
      return 'Pending response';
    case 'PENDING_TENANT':
      return 'Awaiting tenant';
    case 'DRAFT':
      return 'Draft';
    case 'PROPOSED':
      return 'New proposal';
    default:
      return status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  }
}

export function renewalStatusHint(status: string, role: 'tenant' | 'landlord') {
  if (status === 'PROPOSED') {
    return role === 'tenant' ? 'Your landlord proposed new terms — accept, decline, or counter.' : 'Waiting for the tenant to respond to your proposal.';
  }
  if (status === 'PENDING_APPROVAL') {
    return role === 'tenant' ? 'Your landlord is reviewing your counter or proposal.' : 'Review the tenant response or counter offer.';
  }
  if (status === 'APPROVED') return 'Lease terms will update on the agreed dates.';
  if (status === 'REJECTED') return 'This renewal proposal was declined.';
  return role === 'tenant' ? 'Review the proposed rent and end date.' : 'Confirm or counter the renewal terms.';
}

export function isRenewalActionable(status: string) {
  return status !== 'APPROVED' && status !== 'REJECTED';
}

export function countActionableRenewals(renewals: RenewalProposal[]) {
  return renewals.filter((r) => isRenewalActionable(r.status)).length;
}
