# POPIA compliance pack (counsel review backlog)

**Status:** Draft for legal counsel — not approved for production sign-off.

CRENIT's in-app privacy policy and terms (`src/content/legal-pages.ts`) are product summaries. Before production launch in Namibia, counsel should review and approve the items below.

---

## 1. Documents to prepare

| Document | Purpose | Owner |
|----------|---------|--------|
| **Privacy Policy (final)** | Public-facing POPIA-aligned policy | Counsel + product |
| **Terms of Service (final)** | Contractual rules for tenants, landlords, admins | Counsel + product |
| **Data Processing Agreement (DPA)** | Supabase, Vercel, Render, email provider | Counsel + ops |
| **Record of Processing Activities (ROPA)** | Internal register of personal data flows | DPO / ops |
| **Retention & deletion schedule** | KYC, payments, audit logs, market data | Counsel + engineering |
| **Data breach procedure** | 72-hour notification workflow | Counsel + ops |
| **PAIA manual** (if applicable) | Access to information requests | Counsel |

---

## 2. Platform features that support compliance

- Tenant/landlord **privacy & terms** pages: `/company/privacy`, `/company/terms`
- Admin **GDPR tools**: `/admin/compliance` (export, anonymise)
- **Private storage** for KYC and EFT proofs (no public buckets)
- **Market intelligence** — aggregated exports only; n&lt;5 suppression
- **Audit log**: `/admin/audit`

---

## 3. Engineering checklist (pre-counsel)

- [ ] Map all `profiles`, `kyc_documents`, `payments`, `notifications` fields to lawful basis
- [ ] Confirm retention periods in DB jobs vs policy
- [ ] Verify `EMAIL_CONTACT` and transactional email content with counsel
- [ ] Sign DPAs with processors (Supabase, hosting, SMTP)
- [ ] Document cross-border transfers (EU/US hosting) if any

---

## 4. Sign-off

| Item | Counsel | Date | Approved |
|------|---------|------|----------|
| Privacy Policy v1 | | | |
| Terms of Service v1 | | | |
| DPA templates | | | |
| ROPA | | | |
| Retention schedule | | | |

---

*This file is a backlog tracker only. It does not constitute legal advice.*
