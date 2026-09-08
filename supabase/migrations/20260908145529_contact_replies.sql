alter table public.contact_messages drop constraint contact_messages_status_check;
alter table public.contact_messages add constraint contact_messages_status_check check (status in ('new','read','replied'));
alter table public.contact_messages add column replied_at timestamptz;
create table public.contact_replies (
 id uuid primary key,
 contact_message_id uuid not null references public.contact_messages(id) on delete cascade,
 author_id uuid not null default auth.uid() references auth.users(id),
 subject text not null check (char_length(btrim(subject)) between 1 and 250),
 body_html text not null default '' check (char_length(body_html)<=50000),
 body_text text not null default '' check (char_length(body_text)<=15000),
 state text not null default 'draft' check (state in ('draft','sending','sent','failed','unknown')),
 delivery_payload jsonb,
 attempted_at timestamptz,
 provider_id text,
 error_code text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 sent_at timestamptz
);
alter table public.contact_replies enable row level security;
revoke all on public.contact_replies from anon, authenticated;
grant select(id,contact_message_id,author_id,subject,body_html,body_text,state,attempted_at,error_code,created_at,updated_at,sent_at) on public.contact_replies to authenticated;
grant insert(id,contact_message_id,author_id,subject,body_html,body_text) on public.contact_replies to authenticated;
grant update(subject,body_html,body_text,updated_at) on public.contact_replies to authenticated;
grant all on public.contact_replies to service_role;
create policy contact_replies_admin_read on public.contact_replies for select to authenticated using ((select public.is_admin_user()));
create policy contact_replies_admin_insert on public.contact_replies for insert to authenticated with check ((select public.is_admin_user()) and author_id=(select auth.uid()) and state='draft');
create policy contact_replies_author_draft_update on public.contact_replies for update to authenticated using ((select public.is_admin_user()) and author_id=(select auth.uid()) and state='draft') with check ((select public.is_admin_user()) and author_id=(select auth.uid()) and state='draft');
create index contact_replies_message_idx on public.contact_replies(contact_message_id,created_at);
create unique index contact_replies_author_draft_idx on public.contact_replies(contact_message_id,author_id) where state='draft';
