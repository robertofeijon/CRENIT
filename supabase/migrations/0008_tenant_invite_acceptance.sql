-- Add acceptance metadata to tenant invitation records

alter table public.tenant_invitations
  add column if not exists accepted_by uuid references public.profiles(id),
  add column if not exists accepted_at timestamptz;
