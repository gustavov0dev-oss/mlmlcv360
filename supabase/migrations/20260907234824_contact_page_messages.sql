create table public.contact_messages (
 id uuid primary key,
 name text not null check (char_length(btrim(name)) between 1 and 120),
 email text not null check (char_length(email) between 3 and 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 subject text not null default '' check (char_length(subject) <= 200),
 message text not null check (char_length(btrim(message)) between 1 and 5000),
 status text not null default 'new' check (status in ('new','read')),
 created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from anon, authenticated;
grant insert(id,name,email,subject,message) on public.contact_messages to anon, authenticated;
grant select on public.contact_messages to authenticated;
grant update(status) on public.contact_messages to authenticated;
create policy contact_messages_submit on public.contact_messages for insert to anon, authenticated with check (status='new');
create policy contact_messages_admin_read on public.contact_messages for select to authenticated using ((select public.is_admin_user()));
create policy contact_messages_admin_update on public.contact_messages for update to authenticated using ((select public.is_admin_user())) with check ((select public.is_admin_user()));
create index contact_messages_created_at_idx on public.contact_messages(created_at desc);
