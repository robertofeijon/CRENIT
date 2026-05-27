create table if not exists public.lease_renewals (
  id uuid default gen_random_uuid() primary key,
  lease_id uuid not null references public.leases(id) on delete cascade,
  tenant_id uuid references public.profiles(id) on delete set null,
  landlord_id uuid references public.landlord_profiles(id) on delete set null,
  current_end_date date not null,
  proposed_end_date date not null,
  proposed_rent numeric,
  status text default 'PROPOSED' check (status in ('PROPOSED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED')),
  generated_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_lease_renewals_lease_id on public.lease_renewals(lease_id);
create index if not exists idx_lease_renewals_status on public.lease_renewals(status);
