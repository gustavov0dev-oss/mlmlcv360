-- Personal qualifying points: paid purchases plus audited external operations.
alter table public.ranks add column if not exists auto_qualify boolean not null default false;
update public.ranks set auto_qualify=true where min_volume>0 or min_affiliates>0;
create table public.mlm_point_adjustments (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
 points numeric(14,2) not null check(points<>0), reason text not null check(length(trim(reason)) between 5 and 1000),
 reference text not null check(length(trim(reference)) between 3 and 100),
 created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(),
 unique(user_id,reference)
);
alter table public.mlm_point_adjustments enable row level security;
revoke all on public.mlm_point_adjustments from anon,authenticated;
grant select on public.mlm_point_adjustments to authenticated;
create policy points_history_read on public.mlm_point_adjustments for select to authenticated using(user_id=auth.uid() or coalesce((public.account_capabilities()->>'configure_system')::boolean,false));
create index on public.mlm_point_adjustments(user_id,created_at desc);
create or replace function public.rank_points_total(p_user uuid) returns numeric language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce((select sum(points) from mlm_point_entries where user_id=p_user and kind='volume' and reversed_at is null),0)+coalesce((select sum(points) from mlm_point_adjustments where user_id=p_user),0)
$$;
revoke all on function public.rank_points_total(uuid) from public,anon,authenticated;
create or replace function public.evaluate_points_rank(p_user uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare current_slug text; current_order int; candidate text; affiliates int; points numeric;
begin
 if p_user is null then return; end if;
 select rank into current_slug from profiles where id=p_user for update;
 if not found then return; end if;
 select sort_order into current_order from ranks where slug=current_slug;
 select count(*) into affiliates from profiles where sponsor_id=p_user;
 points:=public.rank_points_total(p_user);
 select slug into candidate from ranks where is_active and auto_qualify and (min_volume>0 or min_affiliates>0)
 and min_volume<=points and min_affiliates<=affiliates and sort_order>coalesce(current_order,-1)
 order by sort_order desc,min_volume desc,min_affiliates desc,id limit 1;
 if candidate is not null then update profiles set rank=candidate where id=p_user; end if;
end $$;
revoke all on function public.evaluate_points_rank(uuid) from public,anon,authenticated;
create or replace function public.points_rank_event() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if tg_table_name='profiles' then
  perform public.evaluate_points_rank(new.sponsor_id);
 else
  perform public.evaluate_points_rank(new.user_id);
 end if;
 return new;
end $$;
revoke all on function public.points_rank_event() from public,anon,authenticated;
create trigger evaluate_paid_points after insert or update of reversed_at,points on public.mlm_point_entries for each row execute function public.points_rank_event();
create trigger evaluate_manual_points after insert on public.mlm_point_adjustments for each row execute function public.points_rank_event();
create trigger evaluate_direct_affiliates after insert or update of sponsor_id on public.profiles for each row execute function public.points_rank_event();
create or replace function public.add_rank_points(p_user uuid,p_points numeric,p_reason text,p_reference text,p_request uuid) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare result uuid; previous mlm_point_adjustments;
begin
 if auth.uid() is null or not coalesce((public.account_capabilities()->>'configure_system')::boolean,false) then raise exception 'No tienes permiso para ajustar puntos' using errcode='42501'; end if;
 if p_request is null or p_points is null or p_points=0 or abs(p_points)>100000000 or p_points<>round(p_points,2) then raise exception 'Introduce puntos válidos, con hasta dos decimales'; end if;
 perform 1 from profiles where id=p_user for update;
 if not found then raise exception 'Usuario no encontrado'; end if;
 select * into previous from mlm_point_adjustments where id=p_request;
 if found then
  if previous.user_id=p_user and previous.points=p_points and previous.reason=trim(p_reason) and previous.reference=lower(trim(p_reference)) and previous.created_by=auth.uid() then return previous.id; end if;
  raise exception 'La operación ya existe con otros datos';
 end if;
 if public.rank_points_total(p_user)+p_points<0 then raise exception 'La corrección supera los puntos disponibles'; end if;
 insert into mlm_point_adjustments(id,user_id,points,reason,reference,created_by) values(p_request,p_user,p_points,trim(p_reason),lower(trim(p_reference)),auth.uid()) returning id into result;
 return result;
end $$;
revoke all on function public.add_rank_points(uuid,numeric,text,text,uuid) from public,anon;
grant execute on function public.add_rank_points(uuid,numeric,text,text,uuid) to authenticated;
create or replace function public.rank_points_progress(p_user uuid default auth.uid()) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or (p_user<>auth.uid() and not coalesce((public.account_capabilities()->>'configure_system')::boolean,false)) then raise exception 'Acceso no permitido' using errcode='42501';end if;
 return jsonb_build_object('volume',public.rank_points_total(p_user),'affiliates',(select count(*) from profiles where sponsor_id=p_user),'rank',(select rank from profiles where id=p_user),'history',(select coalesce(jsonb_agg(row_to_json(t)),'[]'::jsonb) from (select points,description,created_at,source,reversed from (select points,description,created_at,'Compra pagada'::text source,reversed_at is not null reversed from mlm_point_entries where user_id=p_user and kind='volume' union all select points,reason||' · '||reference,created_at,'Ajuste administrativo',false from mlm_point_adjustments where user_id=p_user) h order by created_at desc limit 30) t));
end $$;
revoke all on function public.rank_points_progress(uuid) from public,anon;
grant execute on function public.rank_points_progress(uuid) to authenticated;
create or replace function public.my_mlm_points() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('volume',public.rank_points_total(auth.uid()),'commission',coalesce((select sum(points) from mlm_point_entries where user_id=auth.uid() and kind='commission' and reversed_at is null),0))
$$;
revoke all on function public.my_mlm_points() from public,anon;
grant execute on function public.my_mlm_points() to authenticated;
