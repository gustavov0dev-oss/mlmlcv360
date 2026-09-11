create table public.billing_contracts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), plan_slug text not null,
 gateway text not null check(gateway in ('paypal','mercadopago')), amount numeric not null check(amount>0), currency text not null check(currency in ('PEN','USD')),
 provider_id text, provider_plan_id text, checkout_url text,
 status text not null default 'pending' check(status in ('pending','active','cancelled','suspended')),
 paid_until timestamptz, checked_at timestamptz not null default '1970-01-01', last_error text,
 created_at timestamptz not null default now(), unique(gateway,provider_id)
);
alter table public.billing_contracts enable row level security;
grant select on public.billing_contracts to authenticated;
grant all on public.billing_contracts to service_role;
create policy billing_contract_owner on public.billing_contracts for select to authenticated using(user_id=(select auth.uid()) or public.get_my_role() in ('admin','super_admin'));
create unique index billing_one_open on public.billing_contracts(user_id) where status in ('pending','active','suspended');
create index billing_due on public.billing_contracts(checked_at);
alter table public.subscriptions add column if not exists auto_renew boolean not null default false;
alter table public.subscriptions add column if not exists cancel_at_period_end boolean not null default false;
alter table public.subscriptions add column if not exists contract_id uuid references public.billing_contracts(id);
create table public.billing_receipts (
 gateway text not null, provider_payment_id text not null, contract_id uuid not null references public.billing_contracts(id), paid_at timestamptz not null, amount numeric not null,
 primary key(gateway,provider_payment_id)
);
alter table public.billing_receipts enable row level security;
revoke all on public.billing_receipts from anon,authenticated;
grant all on public.billing_receipts to service_role;
create or replace function public.record_subscription_payment(p_contract uuid,p_payment text,p_paid_at timestamptz,p_amount numeric,p_currency text) returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare c billing_contracts%rowtype; until_at timestamptz; inserted integer;
begin
 select * into c from billing_contracts where id=p_contract for update;
 if not found or c.amount<>p_amount or c.currency<>p_currency or p_paid_at>now()+interval '5 minutes' then raise exception 'Pago de suscripción no válido'; end if;
 insert into billing_receipts values(c.gateway,p_payment,c.id,p_paid_at,p_amount) on conflict do nothing;
 get diagnostics inserted = row_count;
 if inserted=0 then return; end if;
 until_at:=p_paid_at+interval '1 month';
 update billing_contracts set paid_until=greatest(paid_until,until_at) where id=c.id;
 insert into transactions(user_id,plan_slug,amount,currency,gateway,transaction_id,status) values(c.user_id,c.plan_slug,p_amount,p_currency,c.gateway,c.gateway||':'||p_payment,'completed');
 if until_at <= now() then return; end if;
 -- An older cancelled agreement cannot overwrite a newer active subscription.
 if exists(select 1 from subscriptions where user_id=c.user_id and contract_id is distinct from c.id and current_period_end>now() and current_period_start>p_paid_at) then return; end if;
 insert into subscriptions(user_id,plan_slug,status,current_period_start,current_period_end,gateway,amount,currency,payment_reference,auto_renew,cancel_at_period_end,contract_id)
 values(c.user_id,c.plan_slug,'active',p_paid_at,until_at,c.gateway,p_amount,p_currency,p_payment,c.status='active',c.status='cancelled',c.id)
 on conflict(user_id) do update set plan_slug=excluded.plan_slug,status='active',current_period_start=excluded.current_period_start,current_period_end=excluded.current_period_end,gateway=excluded.gateway,amount=excluded.amount,currency=excluded.currency,payment_reference=excluded.payment_reference,auto_renew=excluded.auto_renew,cancel_at_period_end=excluded.cancel_at_period_end,contract_id=c.id,updated_at=now()
 where subscriptions.current_period_end is null or subscriptions.current_period_end<=excluded.current_period_end;
 update profiles set plan=c.plan_slug,updated_at=now() where id=c.user_id;
end $$;
revoke all on function public.record_subscription_payment(uuid,text,timestamptz,numeric,text) from public,anon,authenticated;
grant execute on function public.record_subscription_payment(uuid,text,timestamptz,numeric,text) to service_role;
create or replace function public.expire_paid_memberships() returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare free_slug text;
begin
 select slug into free_slug from plans where is_active and price=0 order by sort_order limit 1;
 if free_slug is null then return; end if;
 update profiles p set plan=free_slug,updated_at=now() from subscriptions s where s.user_id=p.id and s.status='active' and s.current_period_end<=now() and p.plan=s.plan_slug;
 update subscriptions set status='expired',updated_at=now() where status='active' and current_period_end<=now();
end $$;
revoke all on function public.expire_paid_memberships() from public,anon,authenticated;
grant execute on function public.expire_paid_memberships() to service_role;
create schema if not exists billing_private;
create table billing_private.scheduler(secret text not null);
insert into billing_private.scheduler values(encode(extensions.gen_random_bytes(32),'hex'));
revoke all on schema billing_private from public,anon,authenticated;
grant usage on schema billing_private to service_role;
grant select on billing_private.scheduler to service_role;
create or replace function public.billing_scheduler_authorized(p_secret text) returns boolean language sql security invoker set search_path=public,pg_temp as $$ select exists(select 1 from billing_private.scheduler where secret=p_secret); $$;
revoke all on function public.billing_scheduler_authorized(text) from public,anon,authenticated;
grant execute on function public.billing_scheduler_authorized(text) to service_role;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.schedule('billing-renewal-sync','* * * * *',$job$
select net.http_post(url:='https://lctyygnwhkoehulkaast.supabase.co/functions/v1/subscription-billing',headers:=jsonb_build_object('Content-Type','application/json','x-billing-secret',(select secret from billing_private.scheduler)),body:='{"action":"sync_due"}'::jsonb,timeout_milliseconds:=55000);
$job$);
select cron.schedule('membership-expiry','*/5 * * * *','select public.expire_paid_memberships()');
