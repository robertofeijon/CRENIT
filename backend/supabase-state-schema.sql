-- CRENIT relational schema for Supabase.
-- This provides a production-ready normalized model.
-- NOTE: app_state table is kept for temporary backward compatibility.

create extension if not exists "pgcrypto";

-- =============================
-- Core users and auth metadata
-- =============================

create table if not exists public.users (
  id text primary key,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'landlord', 'customer')),
  password_hash text not null,
  kyc_status text not null default 'not_submitted'
    check (kyc_status in ('not_submitted', 'pending', 'approved', 'rejected')),
  kyc_submitted_at timestamptz,
  kyc_reviewed_at timestamptz,
  kyc_review_note text,
  reset_token text,
  reset_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_sessions (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  user_agent text,
  ip_address text,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists idx_user_sessions_user_id on public.user_sessions(user_id);
create index if not exists idx_users_email on public.users(lower(email));

create table if not exists public.kyc_documents (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  doc_type text not null,
  file_name text not null,
  url text not null,
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  note text
);

create index if not exists idx_kyc_documents_user_id on public.kyc_documents(user_id);

-- =============================
-- Properties and tenancy
-- =============================

create table if not exists public.properties (
  id text primary key,
  landlord_id text not null references public.users(id) on delete restrict,
  name text not null,
  address text not null,
  city text,
  state text,
  zip_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_properties_landlord_id on public.properties(landlord_id);

create table if not exists public.units (
  id text primary key,
  property_id text not null references public.properties(id) on delete cascade,
  label text not null,
  bedrooms int,
  bathrooms numeric(4,2),
  square_feet int,
  rent_amount numeric(12,2) not null default 0,
  status text not null default 'vacant'
    check (status in ('vacant', 'occupied', 'maintenance')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id, label)
);

create index if not exists idx_units_property_id on public.units(property_id);

create table if not exists public.leases (
  id text primary key,
  unit_id text not null references public.units(id) on delete restrict,
  tenant_id text not null references public.users(id) on delete restrict,
  landlord_id text not null references public.users(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  rent_amount numeric(12,2) not null,
  deposit_amount numeric(12,2) not null default 0,
  terms jsonb not null default '[]'::jsonb,
  document_url text,
  renewal_warning text,
  status text not null default 'active'
    check (status in ('draft', 'active', 'ended', 'terminated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leases_tenant_id on public.leases(tenant_id);
create index if not exists idx_leases_landlord_id on public.leases(landlord_id);
create index if not exists idx_leases_unit_id on public.leases(unit_id);

create table if not exists public.deposit_escrow (
  id text primary key,
  lease_id text not null unique references public.leases(id) on delete cascade,
  total_amount numeric(12,2) not null default 0,
  escrow_status text not null default 'not_funded'
    check (escrow_status in ('not_funded', 'active', 'released', 'disputed')),
  refund_status text not null default 'not_applicable'
    check (refund_status in ('not_applicable', 'pending_review', 'approved', 'partially_approved', 'paid')),
  deductions jsonb not null default '[]'::jsonb,
  timeline jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- =============================
-- Payments and billing
-- =============================

create table if not exists public.payment_methods (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  label text not null,
  method_type text not null,
  last4 text,
  is_primary boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_methods_user_id on public.payment_methods(user_id);

create table if not exists public.payments (
  id text primary key,
  tenant_id text not null references public.users(id) on delete restrict,
  landlord_id text references public.users(id) on delete set null,
  lease_id text references public.leases(id) on delete set null,
  payment_method_id text references public.payment_methods(id) on delete set null,
  due_date date,
  paid_at timestamptz,
  amount numeric(12,2) not null,
  status text not null
    check (status in ('pending', 'paid', 'failed', 'refunded')),
  category text not null default 'rent'
    check (category in ('rent', 'deposit', 'fee', 'refund')),
  label text,
  receipt_url text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_tenant_id on public.payments(tenant_id);
create index if not exists idx_payments_landlord_id on public.payments(landlord_id);
create index if not exists idx_payments_lease_id on public.payments(lease_id);

-- =============================
-- Maintenance and disputes
-- =============================

create table if not exists public.maintenance_requests (
  id text primary key,
  tenant_id text not null references public.users(id) on delete restrict,
  landlord_id text references public.users(id) on delete set null,
  lease_id text references public.leases(id) on delete set null,
  title text not null,
  category text,
  description text,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'closed')),
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_maintenance_tenant_id on public.maintenance_requests(tenant_id);

create table if not exists public.disputes (
  id text primary key,
  tenant_id text not null references public.users(id) on delete restrict,
  landlord_id text references public.users(id) on delete set null,
  payment_id text references public.payments(id) on delete set null,
  title text not null,
  category text,
  status text not null default 'open'
    check (status in ('open', 'under_review', 'resolved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dispute_messages (
  id text primary key,
  dispute_id text not null references public.disputes(id) on delete cascade,
  sender_user_id text references public.users(id) on delete set null,
  sender_role text,
  message text not null,
  sent_at timestamptz not null default now()
);

create index if not exists idx_disputes_tenant_id on public.disputes(tenant_id);
create index if not exists idx_dispute_messages_dispute_id on public.dispute_messages(dispute_id);

-- =============================
-- Notifications, docs, support
-- =============================

create table if not exists public.notifications (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  notification_type text,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);

create table if not exists public.documents (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  lease_id text references public.leases(id) on delete set null,
  payment_id text references public.payments(id) on delete set null,
  doc_type text not null,
  name text not null,
  url text not null,
  uploaded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_documents_user_id on public.documents(user_id);

create table if not exists public.support_tickets (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  topic text not null,
  message text not null,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_tickets_user_id on public.support_tickets(user_id);

-- =============================
-- Metrics and auditing
-- =============================

create table if not exists public.credit_snapshots (
  id text primary key,
  tenant_id text not null references public.users(id) on delete cascade,
  score int,
  tier text,
  on_time_percentage numeric(5,2),
  late_payment_count int,
  payment_streak int,
  report_url text,
  report_share_link text,
  captured_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_credit_snapshots_tenant_id on public.credit_snapshots(tenant_id);

create table if not exists public.audit_events (
  id text primary key,
  actor_user_id text references public.users(id) on delete set null,
  actor_role text,
  actor_email text,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);

create index if not exists idx_audit_events_actor_user_id on public.audit_events(actor_user_id);
create index if not exists idx_audit_events_at on public.audit_events(at desc);

-- =============================
-- Compatibility bridge (legacy)
-- =============================

create table if not exists public.app_state (
  key text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- =============================
-- Common updated_at trigger
-- =============================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_users_set_updated_at'
  ) then
    create trigger trg_users_set_updated_at before update on public.users
      for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'trg_properties_set_updated_at'
  ) then
    create trigger trg_properties_set_updated_at before update on public.properties
      for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'trg_units_set_updated_at'
  ) then
    create trigger trg_units_set_updated_at before update on public.units
      for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'trg_leases_set_updated_at'
  ) then
    create trigger trg_leases_set_updated_at before update on public.leases
      for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'trg_payment_methods_set_updated_at'
  ) then
    create trigger trg_payment_methods_set_updated_at before update on public.payment_methods
      for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'trg_payments_set_updated_at'
  ) then
    create trigger trg_payments_set_updated_at before update on public.payments
      for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'trg_maintenance_requests_set_updated_at'
  ) then
    create trigger trg_maintenance_requests_set_updated_at before update on public.maintenance_requests
      for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'trg_disputes_set_updated_at'
  ) then
    create trigger trg_disputes_set_updated_at before update on public.disputes
      for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'trg_support_tickets_set_updated_at'
  ) then
    create trigger trg_support_tickets_set_updated_at before update on public.support_tickets
      for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'trg_deposit_escrow_set_updated_at'
  ) then
    create trigger trg_deposit_escrow_set_updated_at before update on public.deposit_escrow
      for each row execute function public.set_updated_at();
  end if;
end $$;

-- =============================
-- RLS baseline policies
-- =============================

alter table public.users enable row level security;
alter table public.user_sessions enable row level security;
alter table public.kyc_documents enable row level security;
alter table public.properties enable row level security;
alter table public.units enable row level security;
alter table public.leases enable row level security;
alter table public.deposit_escrow enable row level security;
alter table public.payment_methods enable row level security;
alter table public.payments enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.disputes enable row level security;
alter table public.dispute_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.documents enable row level security;
alter table public.support_tickets enable row level security;
alter table public.credit_snapshots enable row level security;
alter table public.audit_events enable row level security;
alter table public.app_state enable row level security;

-- Keep policy approach permissive for authenticated users for now.
-- Service role remains the backend authority; tighten per-role later.
do $$
declare
  t text;
begin
  foreach t in array array[
    'users','user_sessions','kyc_documents','properties','units','leases','deposit_escrow',
    'payment_methods','payments','maintenance_requests','disputes','dispute_messages',
    'notifications','documents','support_tickets','credit_snapshots','audit_events','app_state'
  ]
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = t and policyname = t || '_select_authenticated'
    ) then
      execute format(
        'create policy %I on public.%I for select to authenticated using (true)',
        t || '_select_authenticated', t
      );
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = t and policyname = t || '_write_authenticated'
    ) then
      execute format(
        'create policy %I on public.%I for all to authenticated using (true) with check (true)',
        t || '_write_authenticated', t
      );
    end if;
  end loop;
end $$;
