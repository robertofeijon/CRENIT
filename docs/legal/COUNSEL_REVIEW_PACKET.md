# Counsel review packet — CRENIT (June 2026)

**Packet version:** `2026.06-draft-1`  
**Status:** Awaiting external counsel sign-off — **not** production-ready.

This packet bundles what counsel needs to review CRENIT's public legal copy and operational privacy posture before Namibia launch.

---

## 1. Documents in this packet

| # | Document | Source in repo | Counsel action |
|---|----------|----------------|----------------|
| A | Privacy Policy (draft) | `apps/web/src/content/legal-pages.ts` → `/company/privacy` | Approve or redline |
| B | Terms of Service (draft) | `legal-pages.ts` → `/company/terms` | Approve or redline |
| C | POPIA summary (draft) | `legal-pages.ts` → `/company/popia-summary` | Approve or redline |
| D | Data retention schedule (draft) | `docs/legal/DATA_RETENTION_SCHEDULE.md` | Approve retention periods |
| E | Processor / DPA list | Section 3 below | Sign DPAs |
| F | ROPA outline | Section 4 below | Complete register |

**Export plain text for counsel:**

```bash
node scripts/export-legal-for-counsel.mjs
```

Output: `docs/legal/exports/counsel-packet-2026.06-draft-1.md`

---

## 2. Product surfaces counsel should know

| Surface | URL path | Notes |
|---------|----------|-------|
| Privacy | `/company/privacy` | Yellow “pending counsel” banner when `counselReview: true` |
| Terms | `/company/terms` | Same banner |
| POPIA summary | `/company/popia-summary` | Plain-language companion |
| KYC flows | `/tenant/kyc`, landlord verification | ID, income, address docs in private storage |
| Admin compliance | `/admin/compliance` | Export + anonymise (GDPR-style tooling) |
| Market data | `/data`, B2B API | Aggregates only; n≥10 public / n≥5 B2B |
| PDF verify | `/verify/[reference]` or `verify.crenit.na/{ref}` | Third-party authenticity check |

---

## 3. Processors (DPA required)

| Processor | Purpose | Data categories | Hosting region |
|-----------|---------|-----------------|----------------|
| **Supabase** | Auth, Postgres, storage | All platform PII | Check project region |
| **Vercel** | Web hosting | Logs, edge requests | US/EU per plan |
| **Render** | API hosting | Logs, env secrets | US/EU per plan |
| **SMTP / Resend / etc.** | Transactional email | Email, names, payment refs | Provider-specific |
| **Africa's Talking** (optional) | SMS 2FA + confirm nudges | Phone, short message content | Africa |
| **Sentry** (optional) | Error monitoring | Stack traces, user id if set | US/EU per plan |

---

## 4. ROPA outline (record of processing)

| Activity | Data subjects | Categories | Lawful basis (draft) | Retention |
|----------|---------------|------------|----------------------|-----------|
| Tenant onboarding | Tenants | Identity, KYC, lease | Contract + consent | See retention schedule |
| Landlord onboarding | Landlords | Identity, KYC, bank payout | Contract + consent | See retention schedule |
| Rent payments | Tenants, landlords | Payment amounts, dates, EFT proofs | Contract | 7 years (draft) |
| Credit scoring | Tenants | Payment behaviour aggregates | Contract | Life of account + 2y |
| Market intelligence | Tenants (anonymised) | Aggregated rent signals | Consent + legitimate interest | Indefinite aggregates |
| Admin audit | All users | Actions, IP | Legitimate interest | 3 years (draft) |
| B2B licensing | Business clients | Contact email, API usage | Contract | Contract term + 1y |

Counsel to validate lawful basis wording under POPIA.

---

## 5. Engineering pre-flight (completed in code)

- [x] Privacy/terms pages with counsel-review banner
- [x] Private buckets for KYC + EFT proofs
- [x] Admin export/anonymise tools
- [x] Market data suppression rules (n≥10 / n≥5)
- [x] `email_delivery_log` for transactional audit
- [ ] **Counsel sign-off** on final policy text
- [ ] **Signed DPAs** with processors
- [ ] **ROPA** filed internally
- [ ] **Breach procedure** runbook approved

---

## 6. Sign-off table

| Document | Version | Reviewer | Date | Approved |
|----------|---------|----------|------|----------|
| Privacy Policy | 2026.06-draft-1 | | | ☐ |
| Terms of Service | 2026.06-draft-1 | | | ☐ |
| POPIA summary | 2026.06-draft-1 | | | ☐ |
| Retention schedule | 2026.06-draft-1 | | | ☐ |
| DPA pack | — | | | ☐ |

---

*This packet does not constitute legal advice. Engage qualified Namibian counsel before production launch.*
