# Data retention schedule (draft — counsel review)

**Version:** `2026.06-draft-1`  
**Status:** Draft — align with final Privacy Policy before enforcement.

| Data category | Examples | Retention (draft) | Deletion method |
|---------------|----------|-------------------|-----------------|
| Account profile | name, email, phone | Active account + **2 years** after closure | Admin anonymise or soft-delete |
| KYC documents | ID, selfie, proof of address | **5 years** after last KYC approval | Storage delete + DB row purge |
| Payment records | amounts, dates, status | **7 years** (tax/audit) | Archive then purge per counsel |
| EFT proof uploads | bank screenshots | **2 years** after payment settled | Storage delete |
| Credit scores & history | score, tier, narrative | Active tenancy + **2 years** | Anonymise tenant link |
| Disputes & deposits | claims, evidence | **5 years** after resolution | Case closure job |
| Notifications | in-app rows | **1 year** | Scheduled purge |
| Email delivery log | SMTP status, retries | **90 days** | `email_delivery_log` cleanup job |
| Admin audit log | admin actions | **3 years** | Archive |
| Market aggregates | suburb stats | **Indefinite** (no PII) | N/A |
| B2B sample requests | email, company | **2 years** | Manual / cron |
| Onboarding email enrollments | sequence state | **1 year** after complete | Cron |
| Payment history imports | CSV rows | **2 years** after review | Tenant request + admin purge |
| Report verifications | shareable PDF refs | Until **expiry** or revoke | `revoked_at` |

## Automated jobs (planned / partial)

- Email retry queue: `email_delivery_log` — 90-day retention TBD in cron
- Report verification expiry: enforced at verify endpoint
- GDPR export/anonymise: `/admin/compliance` — on request

Counsel to confirm periods under Namibian law and tenant/landlord contract terms.
