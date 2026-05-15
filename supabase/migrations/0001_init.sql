-- RentCredit initial schema migration

-- USERS (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  phone text,
  role text check (role in ('TENANT', 'LANDLORD', 'BOTH', 'ADMIN')) default 'TENANT',
  kyc_status text check (kyc_status in ('PENDING', 'VERIFIED', 'REJECTED', 'NOT_SUBMITTED')) default 'NOT_SUBMITTED',
  kyc_submitted_at timestamptz,
  kyc_reviewed_at timestamptz,
  kyc_reviewer_id uuid references public.profiles(id),
  kyc_rejection_reason text,
  income_monthly numeric,
  employer_name text,
  employment_type text check (employment_type in ('EMPLOYED', 'SELF_EMPLOYED', 'CONTRACT', 'GOVERNMENT', 'OTHER')),
  national_id_number text,
  date_of_birth date,
  address_street text,
  address_suburb text,
  address_city text,
  address_postcode text,
  address_country text default 'Namibia',
  geo_lat numeric,
  geo_lng numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- KYC DOCUMENTS
create table public.kyc_documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  doc_type text check (doc_type in ('NATIONAL_ID_FRONT', 'NATIONAL_ID_BACK', 'SELFIE', 'PROOF_OF_INCOME', 'BANK_STATEMENT', 'EMPLOYER_LETTER')),
  storage_path text not null,
  file_name text,
  uploaded_at timestamptz default now()
);

-- LANDLORD PROFILES
create table public.landlord_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade unique,
  business_name text,
  partner_status text check (partner_status in ('PENDING', 'APPROVED', 'SUSPENDED')) default 'PENDING',
  partner_approved_at timestamptz,
  bank_account_name text,
  bank_account_number text,
  bank_name text,
  bank_branch_code text,
  payout_email text,
  created_at timestamptz default now()
);

-- PROPERTIES
create table public.properties (
  id uuid default gen_random_uuid() primary key,
  landlord_id uuid references public.landlord_profiles(id) on delete cascade,
  property_name text not null,
  address_street text not null,
  address_suburb text not null,
  address_city text not null,
  address_postcode text,
  property_type text check (property_type in ('APARTMENT', 'HOUSE', 'FLAT', 'TOWNHOUSE', 'ROOM', 'COMMERCIAL')),
  geo_lat numeric,
  geo_lng numeric,
  created_at timestamptz default now()
);

-- UNITS
create table public.units (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references public.properties(id) on delete cascade,
  unit_identifier text not null,
  bedrooms integer,
  bathrooms integer,
  monthly_rent numeric not null,
  is_occupied boolean default false,
  created_at timestamptz default now()
);

-- LEASES
create table public.leases (
  id uuid default gen_random_uuid() primary key,
  unit_id uuid references public.units(id),
  tenant_id uuid references public.profiles(id),
  landlord_id uuid references public.landlord_profiles(id),
  start_date date not null,
  end_date date,
  monthly_rent numeric not null,
  status text check (status in ('ACTIVE', 'ENDED', 'TERMINATED')) default 'ACTIVE',
  created_at timestamptz default now()
);

-- TENANT INVITATIONS
create table public.tenant_invitations (
  id uuid default gen_random_uuid() primary key,
  landlord_id uuid references public.landlord_profiles(id),
  unit_id uuid references public.units(id),
  invited_email text not null,
  token text unique not null,
  status text check (status in ('PENDING', 'ACCEPTED', 'EXPIRED')) default 'PENDING',
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);

-- PAYMENTS
create table public.payments (
  id uuid default gen_random_uuid() primary key,
  lease_id uuid references public.leases(id),
  tenant_id uuid references public.profiles(id),
  landlord_id uuid references public.landlord_profiles(id),
  unit_id uuid references public.units(id),
  amount_gross numeric not null,
  commission_rate numeric not null,
  commission_amount numeric not null,
  amount_net numeric not null,
  due_date date not null,
  paid_date timestamptz,
  payment_method text check (payment_method in ('EFT', 'CARD', 'MOBILE_MONEY', 'SIMULATED')),
  status text check (status in ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'OVERDUE')) default 'PENDING',
  is_simulated boolean default true,
  sim_transaction_id text,
  days_overdue integer default 0,
  late_fee numeric default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- DEPOSITS
create table public.deposits (
  id uuid default gen_random_uuid() primary key,
  lease_id uuid references public.leases(id),
  tenant_id uuid references public.profiles(id),
  landlord_id uuid references public.landlord_profiles(id),
  amount numeric not null,
  commission_rate numeric default 0.005,
  commission_amount numeric,
  status text check (status in ('HELD', 'REFUND_PENDING', 'REFUNDED', 'DISPUTED', 'FORFEITED')) default 'HELD',
  collected_date timestamptz default now(),
  refund_requested_at timestamptz,
  refund_completed_at timestamptz,
  is_simulated boolean default true,
  sim_escrow_id text,
  created_at timestamptz default now()
);

-- DISPUTES
create table public.disputes (
  id uuid default gen_random_uuid() primary key,
  deposit_id uuid references public.deposits(id),
  raised_by uuid references public.profiles(id),
  claim_description text not null,
  status text check (status in ('OPEN', 'UNDER_REVIEW', 'RESOLVED_TENANT', 'RESOLVED_LANDLORD', 'CLOSED')) default 'OPEN',
  resolution_notes text,
  resolved_by uuid references public.profiles(id),
  opened_at timestamptz default now(),
  resolved_at timestamptz
);

-- DISPUTE EVIDENCE
create table public.dispute_evidence (
  id uuid default gen_random_uuid() primary key,
  dispute_id uuid references public.disputes(id),
  uploaded_by uuid references public.profiles(id),
  storage_path text not null,
  file_name text,
  description text,
  uploaded_at timestamptz default now()
);

-- CREDIT SCORES
create table public.credit_scores (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.profiles(id),
  score integer not null check (score between 300 and 900),
  tier text check (tier in ('EXCELLENT', 'GOOD', 'FAIR', 'BUILDING')) not null,
  payment_history_score numeric,
  streak_score numeric,
  history_length_score numeric,
  income_rent_ratio_score numeric,
  deposit_management_score numeric,
  calculation_date timestamptz default now(),
  is_current boolean default true
);

-- CREDIT SCORE FACTORS
create table public.credit_score_factors (
  id uuid default gen_random_uuid() primary key,
  score_id uuid references public.credit_scores(id),
  factor_name text not null,
  weight numeric not null,
  raw_value numeric,
  weighted_contribution numeric,
  notes text
);

-- CREDIT REPORTS
create table public.credit_reports (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.profiles(id),
  score_snapshot integer,
  tier_snapshot text,
  storage_path text,
  download_count integer default 0,
  generated_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '90 days')
);

-- MARKET DATA
create table public.market_data_snapshots (
  id uuid default gen_random_uuid() primary key,
  suburb text not null,
  city text not null,
  property_type text,
  bedrooms integer,
  avg_rent numeric,
  min_rent numeric,
  max_rent numeric,
  median_rent numeric,
  on_time_rate numeric,
  avg_days_to_pay numeric,
  sample_count integer,
  snapshot_date date default current_date,
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.payments enable row level security;
alter table public.deposits enable row level security;
alter table public.credit_scores enable row level security;

-- Profiles: users can read/update their own
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Payments: tenant or landlord of the lease
create policy "Tenant can view own payments" on public.payments for select using (auth.uid() = tenant_id);
create policy "Landlord can view their payments" on public.payments for select using (
  exists (select 1 from public.landlord_profiles lp where lp.id = payments.landlord_id and lp.user_id = auth.uid())
);

-- Credit scores: tenant can view own
create policy "Tenant can view own scores" on public.credit_scores for select using (auth.uid() = tenant_id);
