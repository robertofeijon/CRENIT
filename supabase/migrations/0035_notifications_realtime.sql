-- Enable Supabase Realtime for in-app notification delivery (tenant + landlord dashboards).
-- Apply in Supabase SQL Editor after 0034. RLS policy notifications_owner_access already scopes rows to auth.uid().

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;
