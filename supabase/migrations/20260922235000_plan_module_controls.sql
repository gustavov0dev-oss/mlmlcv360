alter table public.mlm_packs add column if not exists sort_order integer not null default 0;
alter table public.mlm_packs add column if not exists badge text not null default '';
with ordered as (select id,row_number() over(order by created_at desc,id)-1 as n from public.mlm_packs)
update public.mlm_packs p set sort_order=o.n from ordered o where p.id=o.id;

insert into public.system_config(key,value,category,is_sensitive) values
('system_plans_enabled','true','plans',false),('mlm_packs_enabled','true','plans',false)
on conflict(key) do nothing;

-- Extend the existing transactional save without replacing its product validation.
do $migration$
declare definition text;
begin
 select pg_get_functiondef('public.save_mlm_pack(jsonb,jsonb)'::regprocedure) into definition;
 definition:=replace(definition,' return id_;', $patch$
 update public.mlm_packs set badge=left(coalesce(p_pack->>'badge',''),40),
 sort_order=coalesce((p_pack->>'sort_order')::integer,sort_order) where id=id_;
 return id_;$patch$);
 execute definition;
 select pg_get_functiondef('public.quote_mlm_pack(jsonb)'::regprocedure) into definition;
 definition:=replace(definition,'begin', $patch$begin
 if exists(select 1 from public.system_config where key='mlm_packs_enabled' and value='false') then
 raise exception 'Los packs MLM no están disponibles. Puedes comprar productos individuales.';
 end if;$patch$);
 execute definition;
end $migration$;

create or replace function public.reorder_mlm_packs(p_ids uuid[]) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or public.get_my_role() not in ('admin','super_admin') then raise exception 'No autorizado'; end if;
 if cardinality(p_ids)<>(select count(*) from mlm_packs)
 or cardinality(p_ids)<>(select count(distinct x) from unnest(p_ids) x)
 or exists(select 1 from unnest(p_ids) x where not exists(select 1 from mlm_packs where id=x)) then
 raise exception 'La lista cambió. Actualiza antes de ordenar.';end if;
 update mlm_packs p set sort_order=u.n-1 from unnest(p_ids) with ordinality u(id,n) where p.id=u.id;
end $$;
revoke all on function public.reorder_mlm_packs(uuid[]) from public;
grant execute on function public.reorder_mlm_packs(uuid[]) to authenticated;
