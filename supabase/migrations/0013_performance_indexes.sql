create index if not exists idx_payments_tenant_status_due_date
  on public.payments(tenant_id, status, due_date);

create index if not exists idx_payments_landlord_status_created_at
  on public.payments(landlord_id, status, created_at desc);

create index if not exists idx_leases_landlord_status_end_date
  on public.leases(landlord_id, status, end_date);

create index if not exists idx_leases_tenant_status
  on public.leases(tenant_id, status);

create index if not exists idx_tenant_invitations_landlord_status_created_at
  on public.tenant_invitations(landlord_id, status, created_at desc);

create index if not exists idx_tenant_invitations_email_status
  on public.tenant_invitations(invited_email, status);

create index if not exists idx_lease_renewals_tenant_status_created_at
  on public.lease_renewals(tenant_id, status, created_at desc);

create index if not exists idx_lease_renewals_landlord_status_created_at
  on public.lease_renewals(landlord_id, status, created_at desc);

create index if not exists idx_profiles_kyc_status_updated_at
  on public.profiles(kyc_status, updated_at desc);
