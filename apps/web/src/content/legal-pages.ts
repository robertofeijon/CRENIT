export type LegalSection = { heading: string; paragraphs: string[] };

export type LegalPageContent = {
  title: string;
  headline: string;
  description: string;
  bullets: string[];
  lastUpdated: string;
  sections: LegalSection[];
};

export const LEGAL_PAGES: Record<string, LegalPageContent> = {
  'company/privacy': {
    title: 'Privacy Policy',
    headline: 'How CRENIT protects your personal data.',
    description:
      'CRENIT processes personal information to verify rent payments, run KYC, and provide rental credit and market intelligence services. This policy explains what we collect, why, and your rights.',
    bullets: ['Purpose-limited collection', 'Encrypted storage', 'Export & erasure tools'],
    lastUpdated: 'June 2026',
    sections: [
      {
        heading: 'Who we are',
        paragraphs: [
          'CRENIT ("we", "us") operates a rental payments and credit platform in Namibia. For privacy enquiries contact us at the email shown on our contact page.',
          'We act as a responsible party for account, KYC, and payment data you provide when using the platform.',
        ],
      },
      {
        heading: 'Information we collect',
        paragraphs: [
          'Account data: name, email, phone, role (tenant or landlord), and profile preferences.',
          'Identity & KYC: government ID, selfie, proof of income, proof of address, and admin review outcomes.',
          'Payment data: rent amounts, due dates, payment method, transaction status, EFT proof uploads, and receipts.',
          'Property & lease data: addresses, unit identifiers, lease terms, deposits, and landlord–tenant relationships.',
          'Technical data: IP address, device/browser type, audit logs, and security events (e.g. 2FA usage).',
          'Market intelligence: only anonymised, aggregated payment signals enter licensable reports — never tenant names or unit addresses in exports.',
        ],
      },
      {
        heading: 'How we use information',
        paragraphs: [
          'To verify identity (KYC) and onboard landlords and tenants.',
          'To record rent payments, calculate rental credit scores, and generate PDF reports.',
          'To operate deposit holds, disputes, and landlord portfolio tools.',
          'To send transactional email (invites, payment reminders, password reset, contact form replies) via our mail provider.',
          'To produce aggregated market intelligence where landlords have consented and minimum sample rules are met.',
          'To comply with law, prevent fraud, and respond to lawful requests.',
        ],
      },
      {
        heading: 'Legal basis & POPIA',
        paragraphs: [
          'We process data where necessary to perform our contract with you, with your consent (e.g. market data opt-in), or for legitimate interests such as fraud prevention.',
          'Where the Protection of Personal Information Act (POPIA) applies, you may request access, correction, or deletion subject to legal retention requirements.',
          'Admins may export or anonymise user records through the compliance workspace for GDPR-style data-subject requests.',
        ],
      },
      {
        heading: 'Sharing & processors',
        paragraphs: [
          'We use Supabase (database & auth), hosting providers (e.g. Vercel, Render), and email delivery (SMTP/Nodemailer) as processors under contractual safeguards.',
          'We do not sell personal information. Aggregated market data licensed to banks or developers contains no direct identifiers.',
          'We may disclose information if required by law or to protect rights, safety, and platform integrity.',
        ],
      },
      {
        heading: 'Retention & security',
        paragraphs: [
          'We retain payment and KYC records for as long as needed to provide services, resolve disputes, and meet regulatory obligations.',
          'Documents are stored in private buckets; access is via signed URLs or the API service role — not public URLs.',
          'Passwords are handled by Supabase Auth; we do not store plain-text passwords.',
        ],
      },
      {
        heading: 'Your rights',
        paragraphs: [
          'Access and update profile data in tenant or landlord settings.',
          'Request account closure or data export by contacting us; admins can assist via the compliance tools.',
          'Withdraw market data consent where applicable (may limit certain landlord features).',
          'Lodge a complaint with the relevant data protection authority if you believe your rights have been infringed.',
        ],
      },
      {
        heading: 'Changes',
        paragraphs: [
          'We may update this policy as the product evolves. Material changes will be reflected on this page with an updated date.',
        ],
      },
    ],
  },
  'company/terms': {
    title: 'Terms of Service',
    headline: 'Rules for using the CRENIT platform.',
    description:
      'These terms govern access to CRENIT web applications, APIs, and related services. By creating an account or using the platform you agree to them.',
    bullets: ['Accurate accounts', 'Verified payments only', 'Market data consent'],
    lastUpdated: 'June 2026',
    sections: [
      {
        heading: 'Acceptance',
        paragraphs: [
          'You must be at least 18 years old and able to enter a binding contract. Landlords represent they have authority to register properties and invite tenants.',
          'If you use CRENIT on behalf of an organisation, you warrant you have authority to bind that organisation.',
        ],
      },
      {
        heading: 'Accounts & security',
        paragraphs: [
          'Provide accurate registration information and keep credentials confidential.',
          'You are responsible for activity under your account. Notify us promptly of unauthorised access.',
          'We may require KYC, partner verification, or two-factor authentication for certain roles or actions.',
          'Admin access is restricted to approved email addresses configured by CRENIT operators.',
        ],
      },
      {
        heading: 'Rent payments & credit scores',
        paragraphs: [
          'CRENIT rental credit scores are derived from verified payment behaviour on the platform — not self-reported data.',
          'Scores and reports are informational; they do not guarantee lending approval by third parties.',
          'Landlords must confirm direct (off-platform) payments honestly; false confirmation may result in suspension.',
          'Tenants must not submit fraudulent EFT proofs or dispute deposits in bad faith.',
        ],
      },
      {
        heading: 'Deposits & disputes',
        paragraphs: [
          'Deposit records reflect amounts held and released as entered by landlords and tenants. CRENIT facilitates tracking and dispute workflows but is not a bank unless explicitly stated for a given product.',
          'Disputes are resolved through the in-platform process and admin review where applicable.',
        ],
      },
      {
        heading: 'Market intelligence',
        paragraphs: [
          'Landlords may opt in to contribute anonymised payment data to aggregated market reports.',
          'Licensed B2B data products are subject to separate agreements, minimum sample sizes, and acceptable-use restrictions.',
          'You may not attempt to re-identify individuals from aggregated datasets.',
        ],
      },
      {
        heading: 'Acceptable use',
        paragraphs: [
          'Do not misuse the platform for fraud, harassment, reverse engineering, or scraping beyond documented APIs.',
          'Do not upload malware or unlawful content. Do not attempt to bypass RLS, rate limits, or authentication.',
          'We may suspend or terminate accounts that violate these terms or pose risk to other users.',
        ],
      },
      {
        heading: 'Service availability',
        paragraphs: [
          'We strive for high availability but do not guarantee uninterrupted service. Maintenance, third-party outages, or force majeure may cause downtime.',
          'Features labelled pilot or beta may change or be withdrawn without notice.',
        ],
      },
      {
        heading: 'Liability',
        paragraphs: [
          'To the fullest extent permitted by law, CRENIT is not liable for indirect or consequential damages arising from use of the platform.',
          'Our total liability for any claim is limited to fees paid to CRENIT in the twelve months preceding the claim, or N$1,000 if no fees were paid, whichever is greater.',
        ],
      },
      {
        heading: 'Governing law',
        paragraphs: [
          'These terms are governed by the laws of Namibia. Courts in Windhoek have exclusive jurisdiction unless mandatory consumer protection law requires otherwise.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: [
          'Questions about these terms: use the contact page or email address published on crenit.co.',
        ],
      },
    ],
  },
};
