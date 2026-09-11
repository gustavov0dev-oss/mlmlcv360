create table if not exists public.payment_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 order_id uuid references public.orders(id), plan_slug text, gateway text not null,
 amount numeric not null check(amount>=0), currency text not null check(currency in ('PEN','USD')),
 status text not null default 'pending' check(status in ('pending','review','paid','rejected')),
 provider_id text, checkout_url text, receipt_path text, operation_reference text,
 created_at timestamptz not null default now(), paid_at timestamptz,
 check ((order_id is null) <> (plan_slug is null))
);
alter table public.payment_sessions enable row level security;
grant select on public.payment_sessions to authenticated;
create policy payment_sessions_read on public.payment_sessions for select to authenticated using(user_id=auth.uid() or public.get_my_role() in ('admin','super_admin'));
create unique index payment_provider_unique on public.payment_sessions(gateway,provider_id) where provider_id is not null;
create index payment_sessions_user on public.payment_sessions(user_id,created_at desc);
alter table public.transactions alter column plan_slug drop not null;
alter table public.transactions add column if not exists order_id uuid references public.orders(id);
create or replace function public.complete_payment_session(p_id uuid) returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare s payment_sessions%rowtype;
begin
 select * into s from payment_sessions where id=p_id for update;
 if not found then raise exception 'Pago no encontrado'; end if;
 if s.status='paid' then return; end if;
 if s.status='rejected' then raise exception 'Pago rechazado'; end if;
 if s.order_id is not null then
  update orders set payment_status='paid',payment_reference=coalesce(s.provider_id,s.operation_reference,s.id::text),updated_at=now() where id=s.order_id;
 else
  insert into subscriptions(user_id,plan_slug,status,current_period_start,current_period_end,gateway,amount,currency,payment_reference,updated_at)
  values(s.user_id,s.plan_slug,'active',now(),now()+interval '1 month',s.gateway,s.amount,s.currency,s.id::text,now())
  on conflict(user_id) do update set plan_slug=excluded.plan_slug,status='active',current_period_start=excluded.current_period_start,current_period_end=excluded.current_period_end,gateway=excluded.gateway,amount=excluded.amount,currency=excluded.currency,payment_reference=excluded.payment_reference,updated_at=now();
  update profiles set plan=s.plan_slug,updated_at=now() where id=s.user_id;
 end if;
 insert into transactions(user_id,plan_slug,order_id,amount,currency,gateway,transaction_id,status) values(s.user_id,s.plan_slug,s.order_id,s.amount,s.currency,s.gateway,s.id::text,'completed');
 update payment_sessions set status='paid',paid_at=now() where id=s.id;
end $$;
revoke all on function public.complete_payment_session(uuid) from public,anon,authenticated;
grant execute on function public.complete_payment_session(uuid) to service_role;
update payment_gateways set is_active=false,test_mode=false where slug in ('culqi','niubiz','izipay');
update payment_gateways set test_mode=false where slug in ('paypal','mercadopago','yape');
update payment_gateways set name='Yape',description='Pago manual con comprobante' where slug='yape';
insert into payment_gateways(slug,name,logo,currency,is_active,test_mode,credentials,description)
values ('plin','Plin','📱','PEN',false,false,'{"phone_number":"","merchant_name":""}','Pago manual con comprobante'),
('transfer','Transferencia bancaria','🏦','PEN',false,false,'{"accounts":"[]"}','Cuentas bancarias opcionales') on conflict(slug) do nothing;
update system_config set is_sensitive=true where key='fixer_api_key';
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('payment-receipts','payment-receipts',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf']) on conflict(id) do nothing;
create policy receipt_insert on storage.objects for insert to authenticated with check(bucket_id='payment-receipts' and (storage.foldername(name))[1]=auth.uid()::text);
create policy receipt_read on storage.objects for select to authenticated using(bucket_id='payment-receipts' and ((storage.foldername(name))[1]=auth.uid()::text or public.get_my_role() in ('admin','super_admin')));
