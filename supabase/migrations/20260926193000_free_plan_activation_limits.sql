alter table public.plans add column if not exists free_once_per_user boolean not null default false;
create table if not exists public.free_plan_claims (
 user_id uuid not null references auth.users(id) on delete cascade,
 plan_slug text not null,
 first_claimed_at timestamptz not null default now(),
 primary key(user_id,plan_slug)
);
alter table public.free_plan_claims enable row level security;
revoke all on public.free_plan_claims from anon,authenticated;
grant select on public.free_plan_claims to authenticated;
create policy free_claims_owner_read on public.free_plan_claims for select to authenticated using(user_id=auth.uid());
insert into public.free_plan_claims(user_id,plan_slug,first_claimed_at)
select user_id,plan_slug,coalesce(current_period_start,created_at,now()) from public.subscriptions where gateway='free'
on conflict do nothing;

create or replace function public.track_free_plan_claim()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare once_only boolean;
begin
 if new.gateway<>'free' or new.status<>'active' then return new;end if;
 if tg_op='UPDATE' then
  if old.plan_slug=new.plan_slug and old.status='active' and old.current_period_start is not distinct from new.current_period_start then return new;end if;
 end if;
 -- Serialize claims for the same person, including competing browser tabs.
 perform 1 from profiles where id=new.user_id for update;
 select free_once_per_user into once_only from plans where slug=new.plan_slug;
 if coalesce(once_only,false) and exists(select 1 from free_plan_claims where user_id=new.user_id and plan_slug=new.plan_slug) then
  raise exception 'Ya utilizaste este plan gratuito. Solo se permite una activación por usuario';
 end if;
 insert into free_plan_claims(user_id,plan_slug) values(new.user_id,new.plan_slug) on conflict do nothing;
 return new;
end $$;
revoke all on function public.track_free_plan_claim() from public,anon,authenticated;
create trigger subscription_free_claim after insert or update on public.subscriptions for each row execute function public.track_free_plan_claim();

create or replace function public.activate_free_membership(p_plan_slug text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.plans%rowtype; s public.subscriptions%rowtype;
begin
 if auth.uid() is null then raise exception 'Inicia sesión';end if;
 perform 1 from profiles where id=auth.uid() and status='active' for update;
 if not found then raise exception 'La cuenta no está activa';end if;
 if exists(select 1 from system_config where key='system_plans_enabled' and value='false') then raise exception 'No se ofrecen nuevas membresías';end if;
 select * into p from plans where slug=p_plan_slug and is_active and is_free and price=0;
 if not found then raise exception 'Plan gratuito no disponible';end if;
 if exists(select 1 from billing_contracts where user_id=auth.uid() and status in ('active','pending','suspended')) then raise exception 'Revisa primero tu contrato pendiente o su renovación en Mi Plan';end if;
 select * into s from subscriptions where user_id=auth.uid() for update;
 if found and s.status='active' and (s.current_period_end is null or s.current_period_end>now()) then raise exception 'Ya tienes una membresía activa. Revisa su vigencia en Mi Plan antes de cambiarla';end if;
 insert into subscriptions(user_id,plan_slug,status,gateway,amount,currency,current_period_start,current_period_end,auto_renew,cancel_at_period_end,contract_id,updated_at)
 values(auth.uid(),p.slug,'active','free',0,p.currency,now(),case when p.trial_days>0 then now()+make_interval(days=>p.trial_days) else null end,false,false,null,now())
 on conflict(user_id) do update set plan_slug=excluded.plan_slug,status=excluded.status,gateway=excluded.gateway,amount=excluded.amount,currency=excluded.currency,current_period_start=excluded.current_period_start,current_period_end=excluded.current_period_end,auto_renew=false,cancel_at_period_end=false,contract_id=null,updated_at=now();
 update profiles set plan=p.slug,updated_at=now() where id=auth.uid();
 return jsonb_build_object('success',true);
exception when others then return jsonb_build_object('success',false,'error',sqlerrm);
end $$;
revoke all on function public.activate_free_membership(text) from public,anon;
grant execute on function public.activate_free_membership(text) to authenticated;
