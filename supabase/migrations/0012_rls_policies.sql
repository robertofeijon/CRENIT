alter table public.profiles enable row level security;
alter table public.kyc_documents enable row level security;
alter table public.tenant_invitations enable row level security;
alter table public.leases enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.lease_renewals enable row level security;
alter table public.kyc_audit_log enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update using (id = auth.uid());

drop policy if exists "kyc_documents_owner_access" on public.kyc_documents;
create policy "kyc_documents_owner_access" on public.kyc_documents
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "tenant_invitations_email_or_acceptor_access" on public.tenant_invitations;
create policy "tenant_invitations_email_or_acceptor_access" on public.tenant_invitations
for select using (
  accepted_by = auth.uid()
  or lower(invited_email) = lower(auth.email())
);

drop policy if exists "leases_tenant_access" on public.leases;
create policy "leases_tenant_access" on public.leases
for select using (tenant_id = auth.uid());

drop policy if exists "payments_tenant_access" on public.payments;
create policy "payments_tenant_access" on public.payments
for select using (tenant_id = auth.uid());

drop policy if exists "notifications_owner_access" on public.notifications;
create policy "notifications_owner_access" on public.notifications
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "lease_renewals_tenant_access" on public.lease_renewals;
create policy "lease_renewals_tenant_access" on public.lease_renewals
for select using (tenant_id = auth.uid());

drop policy if exists "kyc_audit_log_tenant_access" on public.kyc_audit_log;
create policy "kyc_audit_log_tenant_access" on public.kyc_audit_log
for select using (user_id = auth.uid());
