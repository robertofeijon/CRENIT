# RentCredit — Full Platform Build Prompt (V6.0)

**Stack:** Next.js (App Router) · NestJS · Supabase (PostgreSQL) · Tailwind CSS · Recharts · JWT auth

**Colours:**
- Primary red `#C0392B`
- Dark navy `#1A1A2E`
- Background `#F3F4F6`
- Card white `#FFFFFF`
- Border `#E5E7EB`
- Text primary `#111827`
- Text secondary `#6B7280`

---

## WHAT THIS PLATFORM IS — AND WHY IT EXISTS

RentCredit's primary commercial product is **verified Namibian rental market data**, sold as structured intelligence to banks, mortgage lenders, property developers, urban planners, and investment funds. Every other feature — KYC, credit scores, landlord partnerships, in-platform payments — exists to make that data accurate, trustworthy, and commercially valuable.

The flywheel is:
> Verified landlords → verified tenants → verified payment records → accurate market data → sold to B2B clients → revenue funds platform growth → more landlord partnerships → more data.

Every product and UX decision must serve this flywheel. Features that don't feed data quality or data volume are secondary. Features that compromise data integrity are unacceptable regardless of convenience.

**The five data integrity rules — never compromise these:**

1. **KYC must be rigorous.** Income verification, government ID, and address confirmation are not optional. They are what makes income-to-rent ratio data credible for mortgage underwriters and makes the credit score trustworthy enough for banks to act on. Weak KYC makes the entire data product worthless.

2. **Landlord verification must be real.** A landlord cannot add properties until their identity and property ownership are verified by admin. Unverified landlords cannot invite tenants. This gate is what separates RentCredit data from self-reported rental listings — every record in `market_data` came from a verified, accountable property owner.

3. **Credit scores must be accurate and defensible.** The score is a financial document tenants will submit to banks and mortgage lenders. It must be calculated from verified data, updated promptly on confirmation, and fully auditable. No score may ever be changed without a written reason on record.

4. **Market data must never contain PII.** The `market_data` table is written automatically on payment confirmation. It captures only aggregated behavioural and economic signals — never a name, address, or identifier. Minimum 5 records per suburb before that suburb appears in any report. This is a legal and ethical requirement — enforce it without exception.

5. **Every data point must have a source.** Any report must show exactly how many verified transactions it is based on and the date range of those records. No estimates, no extrapolations, no advertised prices — only transactional records from verified landlord-tenant pairs.

---

## DATABASE SCHEMA — BUILD THIS FIRST

Every entity has its own table. No merging concerns across domains.

```
profiles
  id, full_name, email, role [TENANT/LANDLORD/ADMIN], phone,
  address, geo_lat, geo_lng, created_at

kyc
  id, profile_id FK, id_document_url, selfie_url, income_doc_url,
  income_verified_at, income_expiry_date,
  status [PENDING/APPROVED/REJECTED/EXPIRED],
  rejection_reason, reviewed_by FK, reviewed_at, version [int]
  NOTE: income_expiry_date = income_verified_at + 12 months.
  A background job sets status → EXPIRED and triggers re-verification prompt.
  Previous rejected records are never deleted — new submissions create a new row
  (version increments). All versions remain visible in admin KYC panel.

properties
  id, landlord_id FK, name, address, suburb, city,
  property_type [HOUSE/APARTMENT_BLOCK/TOWNHOUSE_COMPLEX/COMMERCIAL],
  geo_lat, geo_lng, verified [bool], verification_notes, created_at
  NOTE: landlord must be KYC-approved before any property can be added.
  Property is INACTIVE (not usable for leases or tenant invites) until
  admin marks it verified.

units
  id, property_id FK, unit_name, bedrooms, rent_amount,
  due_day_of_month, is_occupied

leases
  id, unit_id FK, tenant_id FK, landlord_id FK,
  start_date, end_date, monthly_rent, deposit_amount,
  payment_method [PLATFORM/DIRECT], lease_pdf_url,
  status [ACTIVE/EXPIRED/RENEWED/TERMINATED], created_at
  NOTE: status → EXPIRED is set automatically when end_date is reached
  and no renewal has been created. A renewal creates a new lease row
  linked via renewed_from_lease_id FK.

payments
  id, lease_id FK, tenant_id FK, landlord_id FK, amount,
  commission_amount, commission_rate,
  method [EFT/CARD/MOBILE/DIRECT],
  status [PENDING/CONFIRMED/OVERDUE],
  payment_track [PLATFORM/DIRECT],
  due_date, paid_at, actual_payment_date,
  days_late [int, 0 if on time],
  confirmed_by [AUTO/LANDLORD], receipt_url
  NOTE: commission_amount = 0 for DIRECT track.
  actual_payment_date is landlord-supplied for DIRECT payments.
  days_late = MAX(0, actual_payment_date - due_date).
  PENDING → OVERDUE is triggered by a background job: grace period = 5 days
  after due_date before status flips. Tenant gets a warning notification on
  due_date, a reminder on day 3, and an OVERDUE notice on day 5.

escrow
  id, lease_id FK, tenant_id FK, landlord_id FK, amount,
  status [HELD/REFUND_PENDING/REFUNDED/DISPUTED],
  collected_at, release_triggered_at, released_at, released_by FK
  NOTE: When lease.end_date is reached, a background job sends a
  release prompt to both parties. If neither triggers a release within
  14 days, admin is notified. Disputed escrow is frozen — neither party
  can initiate release while status = DISPUTED.

disputes
  id, escrow_id FK, filed_by FK, description, evidence_urls[],
  landlord_response, status [OPEN/RESPONDED/RESOLVED],
  admin_resolution, resolved_at, resolved_by FK

credit_scores
  id, tenant_id FK, score [300–900],
  tier [BUILDING/FAIR/GOOD/EXCELLENT],
  payment_history_pct, streak_pct, tenancy_length_pct,
  income_ratio_pct, deposit_pct,
  calculated_at, override_locked [bool], override_notes

score_history
  id, tenant_id FK, score, tier, snapshot_date,
  calculation_source [AUTO/MANUAL_OVERRIDE]

market_data
  id, suburb, city, property_type, bedrooms,
  verified_rent, payment_status [ON_TIME/LATE/OVERDUE],
  days_to_pay [int], income_bracket [BAND_1–BAND_5],
  deposit_ratio, payment_track [PLATFORM/DIRECT],
  days_late [int], lease_duration_months [int],
  property_age_band [NEW/MID/OLD], month_year, captured_at
  RULES:
  - Written automatically on payment status → CONFIRMED. Never by user action.
  - Zero PII. No tenant_id, landlord_id, unit address, or any identifier.
  - Minimum 5 records per suburb before suburb is reportable.
  - Records older than 36 months are archived (not deleted) and excluded
    from live reports unless a B2B client explicitly requests historical range.
  - income_bracket is a 5-band anonymisation:
      BAND_1 = <N$5,000/mo
      BAND_2 = N$5,000–10,000
      BAND_3 = N$10,000–20,000
      BAND_4 = N$20,000–40,000
      BAND_5 = N$40,000+

attachments
  id, landlord_id FK, property_id FK (nullable), unit_id FK (nullable),
  type [PROPERTY_PROOF/LEASE_AGREEMENT/OWNERSHIP_DOC/OTHER],
  file_url, description, status [PENDING/VERIFIED/REJECTED],
  rejection_reason, uploaded_at

notifications
  id, recipient_id FK, type [enum — see Notifications section],
  title, body, link, is_read [bool], created_at
  NOTE: Every platform event that affects a user writes a notification row.
  In-app bell icon shows unread count. Critical events also trigger
  email/SMS via a notification worker (simulated in v1 — log to console,
  swap for SendGrid/Africa's Talking in production).

tenant_invites
  id, landlord_id FK, unit_id FK, email, phone,
  invite_code [unique, 8-char alphanumeric], invite_url,
  status [PENDING/ACCEPTED/EXPIRED], expires_at, accepted_by FK (nullable),
  created_at
  NOTE: invite_code is the join key. If an existing tenant profile's email
  matches the invite email, the platform links the existing profile rather
  than creating a new one. No duplicate profiles permitted.

lease_renewals
  id, original_lease_id FK, new_lease_id FK (nullable),
  proposed_rent, proposed_end_date, status [PROPOSED/ACCEPTED/DECLINED],
  proposed_by [LANDLORD/SYSTEM], proposed_at, responded_at

payment_methods
  id, profile_id FK, type [CARD/EFT/MOBILE],
  last_four, bank_name, is_default

auto_pay_config
  id, tenant_id FK, is_enabled, method_id FK, day_of_month

b2b_clients
  id, name, type [BANK/DEVELOPER/ESTATE_AGENT/GOVERNMENT/RESEARCH],
  access_tier [ONE_TIME/SUBSCRIPTION/API],
  api_key_hash, api_key_prefix, api_key_last_generated,
  reports_this_month, status [ACTIVE/SUSPENDED], created_at

b2b_report_log
  id, client_id FK, report_type, parameters jsonb,
  generated_at, generated_by FK, record_count, file_url

audit_log
  id, actor_id FK, action, entity_type, entity_id,
  metadata jsonb, ip_address, created_at
  Score overrides require non-null notes in metadata before write is accepted.
  All KYC decisions, property verifications, score overrides, escrow
  resolutions, and B2B key operations are logged here.
```

**RLS rules:** Every table locked to its owner via `profile_id`, `landlord_id`, or `tenant_id`. Admins bypass all RLS. No cross-role data exposure. Enforce server-side via `assertRole()` on every protected endpoint — do not rely solely on RLS.

---

## PAYMENT TRACKS — CORE BUSINESS LOGIC

Two tracks exist. Track does not affect ability to build a credit score. Both produce verified, scoreable, market-data-eligible records.

### Track A — Platform Payments (recommended)
Tenant pays through RentCredit. Auto-confirmed on clearance. Commission 0.5–1.5% earned by RentCredit. Instantly verified, fed into credit engine and `market_data`. No manual step required.

### Track B — Direct Payments (landlord-confirmed)
Tenant pays landlord directly — cash, outside EFT, or any other method. Landlord logs in and marks as received, supplying the actual payment date and amount. Once confirmed, treated identically to Track A for scoring and market data. No commission earned.

| | Track A | Track B |
|---|---|---|
| Commission to RentCredit | Yes (0.5–1.5%) | No |
| Score impact | Yes | Yes |
| Market data written | Yes | Yes |
| Confirmation | Automatic | Landlord manually confirms |
| Receipt | Automatic | Landlord-triggered |
| days_late accuracy | Exact | Depends on landlord logging promptly |

**UI language rules:**
- Never imply direct-paying tenants cannot build a score.
- Tenant dashboard (direct track): *"You're building your RentCredit Score through landlord-confirmed payments. Switch to platform payments for instant confirmation and easier receipt tracking."* No urgency.
- Landlord dashboard (per direct tenant): *"Mark this month's payment as received to keep [Name]'s score up to date."* + one-click **Mark as Received** button.

---

## NOTIFICATIONS SYSTEM

A `notifications` table row is written for every significant platform event. An in-app bell icon (top navbar, right side) shows unread count with a red badge. Clicking opens a dropdown panel of the last 20 notifications — each showing title, body, timestamp, and a link to the relevant page. "Mark all read" button at top of panel.

**Notification types and triggers:**

| Type | Recipient | Trigger |
|---|---|---|
| `RENT_DUE_SOON` | Tenant | 3 days before due_date |
| `RENT_OVERDUE` | Tenant | 5 days after due_date (grace period end) |
| `PAYMENT_CONFIRMED` | Tenant | Payment status → CONFIRMED |
| `PAYMENT_MARKED_RECEIVED` | Tenant | Landlord confirms direct payment |
| `MARK_PAYMENT_REMINDER` | Landlord | 2 days after tenant's due_date, if no confirmation yet |
| `KYC_APPROVED` | Tenant/Landlord | Admin approves KYC |
| `KYC_REJECTED` | Tenant/Landlord | Admin rejects KYC (includes reason) |
| `KYC_EXPIRING` | Tenant | 30 days before income_expiry_date |
| `KYC_EXPIRED` | Tenant | income_expiry_date reached |
| `SCORE_UPDATED` | Tenant | Score recalculated and changed |
| `SCORE_MILESTONE` | Tenant | Score crosses a tier boundary |
| `INVITE_ACCEPTED` | Landlord | Tenant accepts unit invite |
| `LEASE_EXPIRING` | Landlord + Tenant | 30 days before lease end_date |
| `LEASE_RENEWAL_PROPOSED` | Tenant | Landlord proposes renewal |
| `LEASE_RENEWAL_RESPONDED` | Landlord | Tenant accepts/declines renewal |
| `DEPOSIT_RELEASE_PROMPT` | Landlord + Tenant | lease end_date reached |
| `DISPUTE_FILED` | Landlord | Tenant files escrow dispute |
| `DISPUTE_RESPONDED` | Tenant | Landlord responds to dispute |
| `DISPUTE_RESOLVED` | Landlord + Tenant | Admin resolves dispute |
| `DOCUMENT_VERIFIED` | Landlord | Admin verifies uploaded document |
| `DOCUMENT_REJECTED` | Landlord | Admin rejects document (includes reason) |
| `PROPERTY_VERIFIED` | Landlord | Admin verifies property |
| `PROPERTY_REJECTED` | Landlord | Admin rejects property (includes reason) |

In v1: write notification rows + log email/SMS to console. All notification types are implemented as a worker function — swap transport layer for SendGrid + Africa's Talking in production without touching notification logic.

---

## TENANT ONBOARDING FLOW

This is the full journey from invite to active tenant — build it as a multi-step flow.

### Step 1 — Invite (landlord side)
Landlord clicks **Invite Tenant** (Quick Actions or inside a unit panel). Form:
- Tenant email address (required)
- Tenant phone number (optional)
- Unit selector (required — invite is tied to a specific unit)
- Personal message (optional)

On submit: platform checks whether a `profiles` record with that email already exists.
- **If yes (returning tenant):** invite is linked to their existing profile. Their score history, KYC, and payment history are preserved. No new account created.
- **If no (new tenant):** a `tenant_invites` row is created with a unique 8-character `invite_code` and an `invite_url` (e.g. `rentcredit.co/join/[code]`). Invite expires in 7 days. A `INVITE_SENT` notification is logged for the landlord.

Landlord can see all pending invites in a table under Tenants: email · unit · sent date · status · Resend / Cancel actions.

### Step 2 — Registration (tenant side)
Tenant opens `invite_url` → lands on a clean registration page (not the main landing page).

Page shows:
- RentCredit logo + *"[Landlord Name] has invited you to manage your rent and build your credit score."*
- If returning tenant (email already in system): prompt to log in instead of register
- Registration form: full name, email (pre-filled from invite, read-only), password, phone, ID number
- Terms & Privacy checkbox

On submit: `profiles` row created with `role = TENANT`. `tenant_invites.status → ACCEPTED`. Lease is automatically created in `status = ACTIVE` using the unit's default rent amount and due day. Landlord notified via `INVITE_ACCEPTED`.

### Step 3 — Onboarding checklist (tenant dashboard)
After registration, tenant lands on their dashboard showing a prominent onboarding checklist card:

```
Getting Started
☐ Complete KYC verification  → [Start KYC]
☐ Review your lease          → [View Lease]
☐ Add a payment method       → [Add Method]   (only if payment_track = PLATFORM)
☐ Make your first payment    → [Pay Rent]
```

Checklist persists until all items are complete. Each item links to the relevant page. Card is dismissible only after all steps are done.

### Returning tenant edge case
If a returning tenant accepts a new invite:
- Their existing `profile_id` is linked to the new lease
- Previous KYC remains valid (no re-verification unless expired)
- Credit score continues from where it left off — no reset
- Payment history from previous tenancies remains on their profile and is visible in their report
- The new landlord can see the tenant's score tier and payment streak but NOT their previous landlord's name, previous property address, or income documents

---

## LEASE LIFECYCLE & RENEWAL FLOW

### Expiry detection
A background job runs nightly and checks all leases where `end_date = today + 30 days`. For each:
- Creates a `lease_renewals` row with `status = PROPOSED`, `proposed_by = SYSTEM`, carrying current rent and a proposed `end_date = current end_date + 12 months`
- Sends `LEASE_EXPIRING` notifications to both landlord and tenant

### Renewal flow (landlord-initiated)
Landlord can also manually propose a renewal from the unit detail panel: **Propose Renewal** button.
Form: new monthly rent (pre-filled with current), new end date, optional note to tenant.
Creates a `lease_renewals` row with `proposed_by = LANDLORD`.
Tenant receives `LEASE_RENEWAL_PROPOSED` notification.

### Tenant response
Tenant sees renewal proposal on their Home dashboard as a prominent card: proposed new rent, new end date, **Accept** / **Decline** buttons.
- Accept: new `leases` row created with `status = ACTIVE`, old lease `status → RENEWED`. `lease_renewals.new_lease_id` populated.
- Decline: `lease_renewals.status → DECLINED`. Landlord notified.

### Lease expiry without renewal
If `end_date` is reached and no renewal is active, `leases.status → EXPIRED`. Tenant's credit score is not penalised for a natural lease end. The tenancy record remains on their profile. Admin is notified if a deposit is still in HELD status on an expired lease.

---

## LATE PAYMENT & GRACE PERIOD LOGIC

Payment status transitions are driven by a background job — never manual:

```
PENDING → OVERDUE: 5 days after due_date with no confirmation
OVERDUE → (stays OVERDUE until confirmed or written off)
```

**Notification schedule per payment cycle:**
- `due_date - 3 days`: `RENT_DUE_SOON` to tenant
- `due_date`: no notification (avoid noise if they paid on time)
- `due_date + 2 days`: `MARK_PAYMENT_REMINDER` to landlord (Track B only — reminder to confirm if received)
- `due_date + 5 days`: `RENT_OVERDUE` to tenant, `PAYMENT_OVERDUE` to landlord

**Credit score impact by days_late:**
- 0 days: full score credit
- 1–5 days (within grace): partial credit (minor penalty)
- 6–14 days: moderate penalty
- 15–30 days: significant penalty
- 30+ days: maximum penalty, streak broken

The `days_late` field on every payment record is the input to the score engine — not a binary on-time/late flag. This allows the score to reflect the real pattern of a tenant's behaviour, not just whether they technically paid before the cutoff.

---

## INCOME VERIFICATION & KYC EXPIRY

Income data underpins the income-to-rent ratio factor in the credit score. If income data goes stale, the score becomes misleading to any bank or lender relying on it.

**Income verification lifecycle:**
- On KYC approval, `income_verified_at` is set and `income_expiry_date = income_verified_at + 12 months`
- 30 days before expiry: `KYC_EXPIRING` notification to tenant with a prompt to upload a new income document
- On expiry: `kyc.status → EXPIRED`, `KYC_EXPIRED` notification sent, income_ratio_pct factor in credit score is flagged as stale
- In the credit score calculation: if income data is expired, income_ratio_pct is weighted at 0 (excluded from the score) and a warning flag is shown on the score card: *"Income verification expired — this factor is not currently contributing to your score. Upload a new income document to restore it."*
- Tenant re-uploads → new `kyc` row (version increments) → admin reviews income doc only (other documents don't need re-verification) → on approval, `income_verified_at` and `income_expiry_date` reset

**Admin KYC panel shows all versions** for a tenant — collapsed by default, expandable. The most recent version is shown prominently. Previous rejections are read-only and cannot be deleted.

---

## GLOBAL LAYOUT SHELL

All authenticated pages share one shell — build as a reusable layout component:

```
┌─────────────────────────────────────────────────────────────┐
│   TOP NAVBAR — 64px, fixed, full width                      │
│   [Wordmark]  [Products▾ Solutions▾ Company▾]  [🔔][Role][Logout] │
├──────────────────┬──────────────────────────────────────────┤
│  SIDEBAR 240px   │  MAIN CONTENT                            │
│  fixed           │  ml-[240px] mt-[64px]                    │
│  bg-[#F9FAFB]    │  bg-[#F3F4F6] p-8                       │
│                  │  scrollable                               │
└──────────────────┴──────────────────────────────────────────┘
```

**Navbar:**
- Left: RentCredit wordmark
- Centre: Products / Solutions / Company dropdowns (Framer Motion opacity + translateY)
- Right: 🔔 bell icon with unread badge · role pill · Logout

Role pills: Landlord = red · Tenant = navy · Admin = dark

**Sidebar:** Role label small uppercase grey · nav items icon + label.
- Active: `bg-[#1A1A2E] text-white rounded-lg`
- Hover: `bg-gray-100 rounded-lg`
- Active route via `usePathname()`

**Cards:** `bg-white rounded-2xl shadow-sm border border-gray-100 p-6`

**Badges:** `rounded-full px-3 py-1 text-xs font-semibold`
- Green = confirmed / approved / excellent
- Amber = pending / fair / expiring
- Red = overdue / rejected
- Grey = building / held
- Navy = active / good

**Mobile:** Sidebar collapses to hamburger drawer below 768px.

---

## LANDING PAGE

**Navbar:** Sticky · Sign In dropdown: Tenant Login / Landlord Login

**Hero:**
- Announcement chip (red text, light red bg)
- Headline: black + *"Credit Story"* in `#C0392B`
- CTAs: **Get Started Free** (red filled) · **Watch Demo** (outlined, modal with video player)
- 4 stat tiles: `N$2.8B+ Tracked` · `3.5M+ Tenants` · `95% On-Time Rate` · `48pts Avg Score Lift`

**How It Works — "The Core Loop":**
6 numbered steps with icons + connecting arrows:
Partner Landlord Onboards → Tenant Pays (Platform or Direct) → Payment Verified → Credit Score Updated → Score Used for Loan / New Tenancy → Anonymised Data Feeds Market Intelligence

**Services (tabbed):**
5 pill tabs: Rent Payments · Credit Score · Deposits · KYC & Identity · Market Data
- Active tab = red bg, white text
- Each tab: description left + illustrated mockup right
- Credit Score tab: SVG arc gauge 300–900, needle at 780, labelled "Good"

**Suburb Data:**
Dark `#1A1A2E` section · table: Suburb | Verified Avg Rent (2BR) | On-Time Rate | Key Uses
6 rows: Khomasdal, Pioneerspark, Katutura, Klein Windhoek, Olympia, Eros
Footnote: *"All figures derived from verified transactions only. Minimum 5 records per suburb. Data range shown for transparency."*

**Testimonials:** 3 cards · carousel arrows

**Get Started split:**
- Left dark navy: "Are You a Tenant?" + red button
- Right light: "Are You a Landlord?" + outlined button

**Footer:** Dark `#1A1A2E` · 5 columns · `rentcredit.co · hello@rentcredit.co · Windhoek, Namibia` · ghost watermark "Build Credit" at bottom

---

## LANDLORD DASHBOARD

**Sidebar nav:** Overview · Properties · Tenants · Payments · Deposits · Leases & Documents · Reports · Settings

**Access gate:** If landlord KYC is pending or no verified properties exist, show a prominent onboarding checklist card on the Overview page. Restrict property-adding and tenant-inviting behind KYC approval at the API level.

---

### Overview

6 stat tiles (3×2): Properties · Active Tenants · Monthly Rent Expected · Collected This Month · Outstanding Balance · Direct Payments Awaiting Confirmation

Two cards below:
- **Left (60%):** Partner Status — business name · KYC badge · deposit summary · 3 actions: Go to Tenant Review, View Payments, Manage Deposits
- **Right (40%):** Quick Actions — Invite Tenant · Add Property · Generate Report · Manage Leases (each with arrow icon)

Note: Remove "Commission Earned" from landlord view — commission is RentCredit's revenue, not the landlord's. Showing it to landlords is confusing and irrelevant to their use of the platform.

---

### Properties

**Property grid (default):**
Each card: property name · address · suburb · units count · active tenants · monthly rent total · verified badge (or amber "Pending Verification") · **Open** button

**Inside property panel (slide-over):**
Tabs: Units · Attachments · Details

**Units tab:**
Grid of unit cards: unit name, bedrooms, rent, occupancy, tenant name if occupied.

Clicking a unit opens a unit detail panel:
- Tenant info: name, KYC status, score tier, payment streak, payment track
- Lease: start/end dates, rent, deposit, method · **Propose Renewal** button if within 60 days of end
- Payment history: date, amount, status, receipt download
- Actions: Edit Rent · View Full Tenant Profile · End Tenancy

**Add Unit** form: unit name, bedrooms, rent amount, due day of month.
**Add Property** form: name, address, suburb, city, property type, geo-coordinates (auto-detect or manual). Newly added = "Pending Verification" until admin approves.

---

### Tenant Invites

Accessible from Quick Actions and from inside any unit panel.

**Invite form:**
- Tenant email (required)
- Tenant phone (optional)
- Unit selector (required)
- Personal message (optional)
- **Send Invite** button

Platform checks for existing profile on email match:
- **Existing profile found:** Shows the tenant's score tier and payment streak (no PII beyond that). Landlord confirms they want to link this tenant to the unit. No new account created.
- **No profile found:** Invite link generated, emailed to tenant (logged to console in v1). Invite expires in 7 days.

**Pending Invites table:**
Email · Unit · Sent · Expires · Status · Resend / Cancel

---

### Leases & Documents

**Path A — Upload existing documents:**
- Document type selector: Proof of Property · Lease Agreement · Ownership Document · Other
- Property + unit selector (optional)
- File picker + description
- After upload: PENDING badge → VERIFIED or REJECTED with reason
- Download button for verified documents

**Path B — In-platform lease builder (free):**
Fields: landlord full name + business name · tenant (picker) · property + unit · start/end dates · monthly rent (N$) · deposit (N$) · payment method · due day (1–28) · special conditions · late penalty toggle · early termination notice period (days)

**Generate Lease PDF** button → branded RentCredit PDF with signature block, ready for both parties to sign and upload back as a verified document.

All lease creation is free. No pricing tiers exist.

---

### Payments

Filter row: date range · status · property · payment track

Table: Tenant · Property · Unit · Due Date · Amount · Track · Method · Status · Days Late · Receipt

**Direct payment actions:**
Per direct-paying tenant with no confirmation this month: *"Mark [Name]'s [Month] payment as received"* banner with **Mark as Received** button. Clicking opens a small form: actual payment date (date picker, max = today) · amount (pre-filled with lease rent, editable) · optional note. Submits and triggers score recalculation + `market_data` write.

---

### Tenants

Search + KYC filter + score tier filter + payment track filter

Table: Name · KYC status · Score tier · Streak · On-time rate · Track · Actions

Tenant profile side panel:
- Personal info · current lease · score + tier · full payment history · escrow status
- KYC controls (if pending on their end)
- **Download Tenant Report PDF**

---

### Deposits

Table: Tenant · Property · Unit · Amount · Status · Collected Date · Actions

Status flow: HELD → REFUND_PENDING → REFUNDED (DISPUTED at any point, freezes funds)

Actions: Release Funds · Request Refund · File Dispute

Dispute form: description + evidence upload (multiple files)

---

### Reports

- **Portfolio Summary PDF** — all properties, collection rates, by-track breakdown
- **Per-Tenant Report** — tenant picker + Generate PDF

Recent reports list: date + download

---

### Settings

- Profile: name, email, phone, business name + Save
- Bank / Payout Details: bank name, account number, branch code
- 2FA toggle (simulated)

---

## TENANT DASHBOARD

**Sidebar nav:** Home · Pay Rent · Deposit · My Credit Score · My Report · Settings

**Architectural rule:** A tenant's profile — KYC, score, escrow, payment history — is permanently attached to them as a person, not to a property. Moving tenancies carry full history forward. `profile_id` is the universal key.

---

### Home

**Onboarding checklist card** (shown until complete):
```
Getting Started
☐ Complete KYC verification  → [Start KYC]
☐ Review your lease          → [View Lease]
☐ Add a payment method       → [Add Method]   (Platform track only)
☐ Make your first payment    → [Pay Rent]
```

Amber alert banner if rent due within 3 days — **Pay Now** shortcut.

Lease renewal card if a renewal has been proposed — shows proposed rent, new end date, **Accept / Decline** buttons.

4 stat tiles: Current Score · Score Tier · Payment Streak (months) · On-Time Rate

Two cards:
- **Left:** Current Rent — property, unit, amount, due date, **Pay Rent** button, track label
- **Right:** Recent Payments — last 5: date, amount, status badge

KYC banner if not yet submitted. Income expiry warning banner if within 30 days of expiry.

---

### Pay Rent

**Platform track:**
- Rent due card: amount, property, due date
- Method selector: EFT · Debit Card · Credit Card (pill toggle)
- Amount pre-filled, read-only
- **Confirm Payment** (red)
- Payment history table: Date | Amount | Method | Status | Days Late | Receipt

**Direct track:**
- Soft info card: *"You're building your RentCredit Score through landlord-confirmed payments. Switch to platform payments for instant confirmation and easier receipt tracking."*
- **Request Switch to Platform Payments** button (notifies landlord)
- Payment history table showing all landlord-confirmed records with status badges

---

### Deposit

Escrow balance card: amount, collection date, reference

4-step tracker: Collected → Held → Refund Pending → Refunded

**File a Dispute** button → description + evidence upload

If status = DISPUTED: show frozen state card — *"Your deposit is currently frozen pending admin resolution. Neither party can release funds until the dispute is resolved."*

---

### My Credit Score

Large SVG arc gauge — 300 to 900, colour gradient red → amber → green, needle at current score.

Score number bold large + tier badge.

If income data is expired: amber warning banner — *"Your income verification has expired. This factor is currently excluded from your score."* + **Update Income Document** button.

**Factor breakdown — 5 progress bars with tooltips:**

| Factor | Weight | Tooltip |
|---|---|---|
| Payment History | 35% | How consistently you've paid rent on time across all tenancies. Every confirmed on-time payment improves this. |
| Payment Streak | 20% | Your current unbroken run of on-time payments. Missing a payment resets this to zero. |
| Tenancy History Length | 20% | How long you've been a verified tenant on the platform. Longer, stable tenancies score higher. |
| Income-to-Rent Ratio | 15% | How your verified monthly income compares to your rent. A lower ratio (income much higher than rent) scores better. Requires current income verification. |
| Deposit Management | 10% | Whether your deposit is held cleanly with no disputes. A resolved dispute in your favour still carries a minor note. |

Score history — Recharts LineChart, last 12 months, `#C0392B` line, tooltip showing score + tier per month.

Next-milestone card: *"X more on-time payments to reach [next tier]."*

---

### My Report

Description of report contents and use cases: bank loan, mortgage pre-qualification, new tenancy application.

**Generate Report** (red) → branded PDF download containing: personal info, KYC status, current score + tier, factor breakdown, full payment history, tenancy history, deposit status, income band (not exact figure).

Previous reports list: date + download.

---

### Settings

Profile: name, email, phone, address + Save

**KYC Documents:**
- ID Document: status + Upload / Re-upload
- Selfie: status + upload
- Income Proof: status + upload + expiry date if approved
- KYC overall status badge

If income is EXPIRED or EXPIRING: prominent amber banner with upload CTA.

Linked Payment Accounts: saved cards/bank accounts, default toggle, add/remove.

2FA toggle.

---

## ADMIN PORTAL

**Sidebar nav:** Dashboard · Users · KYC Queue · Properties · Payments · Escrow & Disputes · Lease Documents · Credit Scores · Data Intelligence · Compliance · System Health

---

### Dashboard

8 stat tiles (4×2): Total Users · Active Landlords · Active Tenants · Payments This Month · Total Commission (Track A) · KYC Pending · Open Disputes · Platform Uptime

---

### Users

Tabs: All · Landlords · Tenants

Table: Name · Role · Status · KYC · Score Tier · Joined · Actions (View, Suspend, Delete)

---

### KYC Queue

Filter: Pending · Approved · Rejected · Expired

Table: Applicant · Role · Version · Submitted · Actions

Side panel on click: ID image · selfie · income doc · income_expiry_date · notes field · **Approve / Reject / Request More Info** buttons + rejection reason field. All versions shown collapsed below current. All actions logged.

---

### Properties

Verification queue for newly added properties.

Table: Property · Landlord · Suburb · Type · Submitted · Status · Actions (Verify / Reject + reason)

All actions logged to `audit_log`.

---

### Payments

Full transaction log.

Filters: date range · landlord · tenant · status · track · days_late range

Table: Tenant · Landlord · Property · Unit · Amount · Commission · Track · Method · Status · Days Late · Date · Receipt

---

### Escrow & Disputes

Tabs: Active Escrows · Open Disputes

Active Escrows: flags any deposit on a lease where `leases.status = EXPIRED` and `escrow.status = HELD` — these need admin attention.

Disputes: Tenant · Landlord · Amount · Filed · Status · Evidence · Admin resolution form. All resolutions logged.

---

### Lease Documents

Attachment verification queue.

Table: Landlord · Property · Unit · Type · Uploaded · Actions (Verify / Reject + reason)

---

### Credit Scores

Table: Tenant · Score · Tier · Last Calculated · Income Status · Override Locked · Actions

Actions: **View Factor Breakdown** (shows all 5 raw inputs) · **Flag Anomaly** · **Manual Override**

Override flow:
- Notes field required (non-empty)
- Confirmation dialog: *"This override will be logged to the audit trail and will lock automatic recalculation for this tenant until released."*
- Sets `override_locked = true`
- Nightly cron skips tenants where `override_locked = true`
- Admin must explicitly click **Release Override Lock** to re-enable automatic calculation

---

## DATA INTELLIGENCE — FULL SPECIFICATION

**This is RentCredit's core B2B product. Not visible to landlords or tenants. Treat with the same seriousness as a financial data terminal.**

---

### How market_data is populated

Every time a payment's status transitions to CONFIRMED (by either track), a background worker writes one record to `market_data`. This worker:

1. Reads the payment record and its linked lease, unit, property, and tenant KYC
2. Extracts only the permitted fields — no names, no addresses, no identifiers
3. Anonymises income: maps the tenant's verified income to the correct BAND_1–BAND_5 bracket
4. Writes the record and immediately checks the suburb's record count
5. If count drops below 5 (e.g. after a deletion), marks the suburb as NON_REPORTABLE

The worker never runs in response to a user action. It is triggered only by the payment confirmation event.

**Fields written per record:**

| Field | Description | Source |
|---|---|---|
| suburb | Suburb of the property | properties.suburb |
| city | City | properties.city |
| property_type | House / Apartment Block / etc. | properties.property_type |
| bedrooms | Number of bedrooms | units.bedrooms |
| verified_rent | Monthly rent amount (N$) | payments.amount |
| payment_status | ON_TIME / LATE / OVERDUE | payments.status |
| days_to_pay | Days from due_date to actual payment | payments.days_late |
| income_bracket | BAND_1–BAND_5 (anonymised) | kyc.income → mapped |
| deposit_ratio | deposit_amount ÷ monthly_rent | leases.deposit_amount / leases.monthly_rent |
| payment_track | PLATFORM / DIRECT | payments.payment_track |
| days_late | Raw days late (0 if on time) | payments.days_late |
| lease_duration_months | Months elapsed since lease start | calculated at write time |
| property_age_band | NEW (<5yr) / MID (5–20yr) / OLD (20yr+) | derived from property metadata if available, else NULL |
| month_year | YYYY-MM of the payment | from due_date |
| captured_at | Timestamp of write | system timestamp |

**What is never written:** tenant_id, landlord_id, unit id, unit name, property name, street address, full income figure, tenant name, phone, email, national ID, or any field that could identify a person or specific property.

---

### Data freshness policy

- Records older than 36 months are moved to an `market_data_archive` table nightly
- Live reports query only active `market_data` (≤36 months) by default
- B2B clients with API access can request historical range explicitly — all requests logged to `b2b_report_log`
- Every generated report must show: *"Based on [N] verified transactions. Data range: [earliest month] – [latest month]. Suburbs with fewer than 5 records are excluded."*

---

### Aggregation rules

Before any suburb appears in any report or API response:
- Minimum 5 records in the active window (≤36 months)
- If a GDPR deletion drops a suburb below 5, it is immediately suppressed from all outputs
- No report may show data for a single property — aggregation is always across multiple verified landlord-tenant pairs
- Trend direction (Stable/Rising/Falling) is calculated as the 3-month rolling average versus the prior 3-month rolling average. Requires minimum 8 records across both windows before a trend is shown.

---

### Admin Data Intelligence panel

**4 stat tiles:** Total Active Records · Usable Suburbs (≥5 records, ≤36 months old) · Last Capture Timestamp · Active B2B Clients

**Suburb intelligence table:**
Suburb · City · Records · Avg Verified Rent · Avg Days to Pay · On-Time Rate · Trend · Earliest Record · Latest Record · **Generate Report** button

Clicking a suburb row expands a detail view:
- Rent distribution chart (Recharts BarChart, bucketed into rent bands)
- On-time rate over time (Recharts LineChart, monthly, last 12 months)
- Income bracket breakdown (Recharts PieChart — BAND_1 through BAND_5)
- Payment track split (Platform vs Direct, Recharts BarChart)
- Property type breakdown

**Report generator:**

Four report types — all generated server-side as branded PDFs. Each report header must state the data range, record count, and generation timestamp.

| Report | Contents | Target buyer |
|---|---|---|
| **Suburb Report** | Avg rent, on-time rate, income bracket spread, days-to-pay distribution, trend, YoY comparison, deposit ratio avg | Estate agents, developers, individual investors |
| **City Overview** | All suburbs with ≥5 records aggregated: rent by property type, by bedroom count, on-time rate map, income bracket heat, affordability index (rent ÷ income bracket midpoint) | City planners, government, investment funds |
| **Lender Risk Pack** | Payment behaviour deep-dive: days_late distribution, overdue rate, streak break patterns, income-to-rent ratio distribution by band, deposit ratio analysis, 12-month trend. Structured for credit risk underwriting. | Banks, mortgage lenders, microfinance institutions |
| **Development Feasibility Pack** | Rental demand signals: vacancy implied rate, rent growth trend, bedroom demand split, property type demand, new vs old property performance differential | Property developers, urban planners, REITs |

Each report type has a **Generate** button that opens a parameters modal:
- Suburb selector (multi-select) or "All Usable Suburbs"
- Date range (default: last 24 months, max: 36 months)
- Property type filter (optional)
- Bedroom count filter (optional)

On generate: record count shown before confirming. If any selected suburb has <5 records, it is excluded and a warning shown. Generated report logged to `b2b_report_log`.

---

### B2B Client management

Table: Client name · Type · Access Tier · Reports This Month · API Key Status · Last Activity · Status · Actions

**Access tiers:**
- **One-time:** Admin generates a single-use download link per report. No API key.
- **Subscription:** Admin generates a persistent API key. Client can pull reports via API up to their monthly plan limit.
- **API:** Full programmatic access with rate limits defined per client.

**API key management:**
- Keys are hashed on storage — only the prefix is shown in the UI
- **Generate Key** button: shows the full key once only in a modal — *"Copy this now. It will not be shown again."* Only the hash is stored.
- **Revoke Key** button: immediately invalidates. Requires a reason logged to `audit_log`.
- All API calls are logged to `b2b_report_log` with client_id, endpoint, parameters, record count returned, and timestamp.

**B2B API endpoints (define these in the backend):**

```
GET /api/b2b/suburbs
  → List of reportable suburbs with record count and last capture date
  → Auth: Bearer [api_key]

GET /api/b2b/suburb/:slug
  → Full aggregated stats for one suburb
  → Params: date_from, date_to, property_type, bedrooms
  → Returns: avg_rent, on_time_rate, avg_days_to_pay, income_bracket_distribution,
             deposit_ratio_avg, trend, record_count, data_range

GET /api/b2b/report/:type
  → Generate and return a structured JSON report
  → type: suburb | city | lender_risk | development
  → Params: suburbs[], date_from, date_to, filters
  → Returns: structured data object (not PDF — PDF is admin-only)

POST /api/b2b/webhook
  → Optional: register a webhook URL to receive a ping when a suburb's
    record count crosses 5 (data becomes available) or when monthly
    data is refreshed
```

Rate limits per API tier — define as environment config, not hardcoded.

---

## ADMIN PORTAL (continued)

### Compliance

Audit log: Event · Actor · Role · Timestamp · IP · Metadata (expandable JSON)

GDPR controls: search by email → **Export Data** (generates JSON of all records linked to that profile) or **Delete Account**. Deletion flow:
1. Anonymise all `market_data` records that could narrow to this tenant (set income_bracket to NULL if it's the only record in that band for that suburb/month)
2. Re-check suburb record counts — if any suburb drops below 5, suppress it
3. Hard-delete `profiles`, `kyc`, `payment_methods`, `auto_pay_config`
4. Soft-delete / anonymise `payments`, `leases`, `escrow` (retain for financial audit, remove all PII fields)
5. Log the deletion action to `audit_log` with actor and timestamp

Fraud flags: manual flag queue for admin review.

---

### System Health

Service status cards: Payment Processing · KYC Service · Credit Engine · Report Generator · Data Pipeline · Notification Worker — each: Operational / Degraded / Down + uptime %

Error rate Recharts LineChart — last 7 days

Recent error log: timestamp · service · message · severity

---

## TECHNICAL REQUIREMENTS

### CSS & Tailwind
- `globals.css`: `@tailwind base; @tailwind components; @tailwind utilities;` at top, imported in `app/layout.tsx`
- `tailwind.config.js` content covers `src/**`, `app/**`, `pages/**`, `components/**`
- Never construct Tailwind class names dynamically

### Charts (Recharts)
- All charts: `ResponsiveContainer width="100%" height={220}`
- Always include `XAxis`, `YAxis`, `Tooltip`, `CartesianGrid`
- Bar fill and line stroke = `#C0392B`

### Animations
- Dropdowns: Framer Motion `opacity` + `translateY`, close on outside click
- Modals: dark overlay, centred card, close on Escape or outside click

### Tables
- Hover row: `bg-gray-50` · consistent column widths · empty state message

### Forms
- Input: `border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#C0392B] focus:border-transparent`
- All forms validated client-side and server-side

### Auth
- JWT. Role enforced server-side on every route.
- `assertRole()` guard on all sensitive endpoints.
- `ADMIN_EMAILS` env var for admin promotion.
- Landlord property + invite actions gated behind KYC approval at API level.

### Background workers (all event-driven or cron — never user-triggered)
- **market_data writer:** fires on payment → CONFIRMED
- **score recalculator:** fires on payment confirmed + nightly cron. Skips tenants with `override_locked = true`.
- **overdue checker:** nightly — flips PENDING → OVERDUE after grace period, sends notifications
- **lease expiry checker:** nightly — detects leases expiring in 30 days, creates renewal proposals, sends notifications
- **deposit release prompt:** nightly — detects HELD deposits on EXPIRED leases, sends admin + party notifications
- **income expiry checker:** nightly — detects KYC income_expiry_date within 30 days or past, sends notifications, sets status flags
- **market_data archiver:** nightly — moves records older than 36 months to archive table
- **notification worker:** consumes notification queue, dispatches in-app rows + email/SMS (console log in v1)

### PDF generation
- Server-side, branded with RentCredit wordmark and colour scheme
- Lease PDF: all form fields, both party names, signature blocks
- Report PDFs: header with data range, record count, generation timestamp, and *"Source: RentCredit verified transaction data"*

### B2B API security
- API keys hashed with bcrypt before storage — only prefix stored in plaintext
- All B2B API calls rate-limited per client tier (env config)
- All B2B API calls logged to `b2b_report_log`
- No PII ever returned from any B2B endpoint — validate this at the serialiser layer, not just the query

### Responsive
- Desktop-first. Sidebar collapses to hamburger drawer below 768px.

---

## EDGE CASES — HANDLE ALL OF THESE

- **Returning tenant accepts new invite:** Link existing `profile_id` to new lease. No score reset. Previous history preserved. New landlord sees tier + streak only — not previous landlord name, property, or income docs.
- **Duplicate registration attempt:** If a tenant tries to register with an email that already has a `profiles` row, redirect to login instead of creating a duplicate account.
- **Landlord marks payment retroactively:** Date picker allows setting actual_payment_date to any date up to today. `days_late` calculated from that date vs `due_date`. `market_data` record uses actual_payment_date for month_year.
- **Suburb drops below 5 records:** Any deletion or GDPR action that drops a suburb below the minimum immediately suppresses it from all reports and B2B API responses. Records are retained — only aggregation is suppressed.
- **Score override protection:** `override_locked = true` prevents the nightly cron from overwriting an admin manual override. Admin must explicitly release the lock. Override lock is shown as a visible badge in the admin Credit Scores table.
- **Disputed escrow:** Status = DISPUTED freezes all release actions. Neither party can act. Only admin resolution unlocks. Admin resolution triggers appropriate release or split, logged to audit_log.
- **KYC income expiry:** Expired income excludes the income_ratio_pct factor from score calculation (weighted to 0). Score card shows a warning. Factor is restored on re-verification approval.
- **KYC rejection re-submission:** Each submission creates a new `kyc` row with incremented version. Previous rejected rows are read-only and permanently visible in admin panel.
- **Lease ends without renewal:** `leases.status → EXPIRED`. No score penalty. If deposit is still HELD, admin is notified. Tenancy record remains on tenant profile.
- **B2B API key rotation:** Revoking a key and generating a new one are separate actions. Revoke logs the reason. New key is shown once in a modal. Old key is immediately invalid.
- **Property rejected by admin:** Landlord receives PROPERTY_REJECTED notification with reason. Property stays in a REJECTED state (not deleted). Landlord can update details and resubmit — creates a new verification request rather than editing the rejected record.