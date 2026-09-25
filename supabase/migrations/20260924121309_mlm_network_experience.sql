-- Custom ranks are already supported by profiles/ranks; commission rules must support them too.
alter table public.mlm_commissions_config drop constraint if exists mlm_commissions_config_rank_check;
create or replace function public.save_mlm_commission_rules(p_rules jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r jsonb; p jsonb:=public.account_capabilities();
begin
 if not coalesce((p->>'manage_mlm_commissions')::boolean,false) then raise exception 'No tienes permiso para editar las comisiones' using errcode='42501'; end if;
 if jsonb_typeof(p_rules)<>'array' or jsonb_array_length(p_rules)>2000 then raise exception 'Reglas inválidas'; end if;
 for r in select * from jsonb_array_elements(p_rules) loop
  if not exists(select 1 from ranks where slug=r->>'rank') and not exists(select 1 from mlm_commissions_config where rank=r->>'rank') then raise exception 'Rango desconocido'; end if;
  if (r->>'level')::int not between 1 and 10 or r->>'type' not in ('percentage','fixed') or (r->>'value')::numeric<0 or (r->>'min_purchase_amount')::numeric<0 or ((r->>'type')='percentage' and (r->>'value')::numeric>100) then raise exception 'Revisa los importes y porcentajes'; end if;
  insert into mlm_commissions_config(rank,level,type,value,min_purchase_amount,status)
  values(r->>'rank',(r->>'level')::int,r->>'type',(r->>'value')::numeric,(r->>'min_purchase_amount')::numeric,case when (r->>'value')::numeric>0 then 'active' else 'inactive' end)
  on conflict(rank,level) do update set type=excluded.type,value=excluded.value,min_purchase_amount=excluded.min_purchase_amount,status=excluded.status;
 end loop;
end $$;
revoke all on function public.save_mlm_commission_rules(jsonb) from public,anon;
grant execute on function public.save_mlm_commission_rules(jsonb) to authenticated;
-- Prevent self sponsorship and cycles for every write, including existing administration RPCs.
create or replace function public.guard_network_cycle() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.sponsor_id is null then return new;end if;
 perform pg_advisory_xact_lock(834702);
 if new.id=new.sponsor_id or exists(with recursive chain as(select id,sponsor_id from profiles where id=new.sponsor_id union select p.id,p.sponsor_id from profiles p join chain c on p.id=c.sponsor_id) select 1 from chain where id=new.id) then raise exception 'El patrocinador no puede ser el mismo usuario ni uno de sus descendientes';end if;
 if new.binary_position is not null and new.binary_position not in ('left','right') then raise exception 'Posición inválida';end if;
 return new;
end $$;
revoke all on function public.guard_network_cycle() from public,anon,authenticated;
create trigger guard_network_cycle before insert or update of sponsor_id,binary_position on public.profiles for each row execute function public.guard_network_cycle();
-- Direct creation must not give every affiliate the same password.
do $$ declare definition text;begin
 select pg_get_functiondef(oid) into definition from pg_proc where pronamespace='public'::regnamespace and proname='add_referral_direct';
 definition:=replace(definition,'''Temp123456!''','encode(extensions.gen_random_bytes(32),''hex'')');
 execute definition;
end $$;
