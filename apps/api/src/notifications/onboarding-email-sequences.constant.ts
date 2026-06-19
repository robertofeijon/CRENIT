export type OnboardingEmailStep = {
  day_offset: number;
  subject: string;
  headline: string;
  body: string;
};

export const TENANT_ONBOARDING_SEQUENCE: OnboardingEmailStep[] = [
  {
    day_offset: 0,
    subject: 'Welcome to CRENIT — your rent can build credit',
    headline: 'Welcome aboard',
    body: 'CRENIT turns verified rent payments into a credit history lenders can trust. Complete KYC, pay rent through your landlord’s invite, and watch your score grow.',
  },
  {
    day_offset: 3,
    subject: 'How CRENIT scoring works (50/30/20)',
    headline: 'Your score explained',
    body: 'Payment history (50%), defaults (30%), and rental tenure (20%) drive your CRENIT score. On-time rent is the fastest lever — aim for three consecutive on-time months.',
  },
  {
    day_offset: 7,
    subject: 'EFT tips for Namibian banks',
    headline: 'Pay rent with confidence',
    body: 'Use the exact payment reference on your lease. Upload your bank proof after EFT so your landlord can confirm quickly — faster confirmation means faster score updates.',
  },
  {
    day_offset: 14,
    subject: 'Share your verified rental credit',
    headline: 'Bank-ready PDFs',
    body: 'Once you have confirmed payments, generate a shareable credit PDF from Reports. Each report includes a QR code lenders can verify.',
  },
  {
    day_offset: 21,
    subject: 'Deposits and disputes on CRENIT',
    headline: 'Stay protected',
    body: 'Track your deposit, upload evidence if something goes wrong, and follow the dispute timeline. Clear records protect both you and your landlord.',
  },
  {
    day_offset: 30,
    subject: 'Keep your rental credit growing',
    headline: 'One month in',
    body: 'Consistency wins. Set a reminder for rent day, confirm your landlord is on CRENIT, and check your credit-score page for your next tier milestone.',
  },
];

export const LANDLORD_ONBOARDING_SEQUENCE: OnboardingEmailStep[] = [
  {
    day_offset: 0,
    subject: 'Welcome to CRENIT for landlords',
    headline: 'Partner verification',
    body: 'Complete partner verification to invite tenants and collect verified rent. Lite landlords (1–3 units) have a streamlined consent path while still confirming every payment.',
  },
  {
    day_offset: 3,
    subject: 'Set up your first property',
    headline: 'Properties & units',
    body: 'Add your property, set monthly rent per unit, and configure bank payout details. Bulk CSV import is available when you manage five or more units.',
  },
  {
    day_offset: 7,
    subject: 'Invite tenants the right way',
    headline: 'Verified invites',
    body: 'Send invites from your dashboard — tenants accept, complete KYC, and pay rent on-platform. Every confirmed payment feeds their credit score and your portfolio insights.',
  },
  {
    day_offset: 14,
    subject: 'Confirm payments promptly',
    headline: 'Confirmation flywheel',
    body: 'Review pending EFT payments daily or use bulk confirm at month-end. Faster confirmation improves tenant scores and strengthens market data quality.',
  },
  {
    day_offset: 21,
    subject: 'Market intelligence for your portfolio',
    headline: 'Local rent context',
    body: 'Once approved, explore suburb benchmarks from your market-data dashboard. Aggregates only — no tenant PII is ever licensed.',
  },
  {
    day_offset: 30,
    subject: 'Grow with CRENIT',
    headline: 'Thirty days on platform',
    body: 'Check your readiness checklist, dispute analytics, and confirmation times. Need help? Reply to this email or visit the contact page.',
  },
];

export function sequenceForRole(role: 'TENANT' | 'LANDLORD'): OnboardingEmailStep[] {
  return role === 'LANDLORD' ? LANDLORD_ONBOARDING_SEQUENCE : TENANT_ONBOARDING_SEQUENCE;
}
