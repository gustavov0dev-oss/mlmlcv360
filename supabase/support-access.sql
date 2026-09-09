create table public.support_access_audit (id uuid primary key default gen_random_uuid(),actor_id uuid not null references auth.users(id),target_id uuid not null references auth.users(id),started_at timestamptz not null default now());
alter table public.support_access_audit enable row level security;
revoke all on public.support_access_audit from anon,authenticated;
grant select on public.support_access_audit to authenticated;
create policy support_access_audit_admin_read on public.support_access_audit for select to authenticated using((select public.is_admin_user()));
