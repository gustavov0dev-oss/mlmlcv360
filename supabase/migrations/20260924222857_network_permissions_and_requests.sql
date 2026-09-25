-- Scope tree access and require member consent for existing-account affiliation.
create or replace function public.network_permission(k text) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null and (public.get_my_role()='super_admin' or coalesce((public.account_capabilities()->>k)::boolean,false))
$$;
revoke all on function public.network_permission(text) from public,anon;
grant execute on function public.network_permission(text) to authenticated;
create table public.network_requests(
 id uuid primary key default gen_random_uuid(), requester_id uuid not null references profiles(id),
 member_id uuid not null references profiles(id), sponsor_id uuid not null references profiles(id),
 previous_sponsor_id uuid references profiles(id), position text not null check(position in ('left','right')),
 status text not null default 'pending' check(status in ('pending','review','accepted','rejected','cancelled')),
 created_at timestamptz not null default now(), resolved_at timestamptz, reviewer_id uuid references profiles(id),
 check(member_id<>sponsor_id)
);
create unique index network_request_pending_member on public.network_requests(member_id) where status in ('pending','review');
alter table public.network_requests enable row level security;
revoke all on public.network_requests from anon,authenticated;
grant select on public.network_requests to authenticated;
create policy network_requests_read on public.network_requests for select to authenticated using(auth.uid() in (requester_id,member_id,sponsor_id) or public.network_permission('move_network_member'));
create or replace function public.search_network_member(p_query text,p_browse boolean default false) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Sesión requerida' using errcode='42501';end if;
 if p_browse and not public.network_permission('view_full_network') then raise exception 'Sin permiso para consultar otras redes' using errcode='42501';end if;
 if length(trim(p_query))<3 then return '[]';end if;
 return (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from (select id,full_name,username,avatar_url, sponsor_id is not null as has_sponsor from profiles where id<>auth.uid() and (case when p_browse then full_name ilike '%'||replace(replace(trim(p_query),'%',''),'_','')||'%' or username ilike '%'||replace(replace(trim(p_query),'%',''),'_','')||'%' else lower(email)=lower(trim(p_query)) or lower(username)=lower(trim(p_query)) end) order by full_name,id limit 12)t);
end $$;
create or replace function public.request_network_membership(p_member uuid,p_sponsor uuid,p_position text default 'left') returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare result uuid; old_sponsor uuid;
begin
 if auth.uid() is null or (p_sponsor<>auth.uid() and not public.network_permission('assign_existing_user')) then raise exception 'Sin permiso para invitar a esta red' using errcode='42501';end if;
 if exists(select 1 from system_config where key='allow_assign_existing_user' and value='false') then raise exception 'Las solicitudes están desactivadas por la empresa';end if;
 perform pg_advisory_xact_lock(834702);
 select sponsor_id into old_sponsor from profiles where id=p_member for update;
 if not found or p_member=p_sponsor or old_sponsor=p_sponsor then raise exception 'Este usuario no está disponible para vincularse a esta red';end if;
 if exists(with recursive ancestors as(select id,sponsor_id from profiles where id=p_sponsor union select p.id,p.sponsor_id from profiles p join ancestors a on p.id=a.sponsor_id) select 1 from ancestors where id=p_member) then raise exception 'No se puede crear un ciclo en la red';end if;
 if (select count(*) from network_requests where requester_id=auth.uid() and created_at>now()-interval '1 day')>=20 then raise exception 'Has alcanzado el límite diario de solicitudes';end if;
 insert into network_requests(requester_id,member_id,sponsor_id,previous_sponsor_id,position) values(auth.uid(),p_member,p_sponsor,old_sponsor,p_position) returning id into result;
 insert into notifications(user_id,title,message,type,link) values(p_member,'Solicitud para unirte a una red',(select coalesce(full_name,username,'Un usuario') from profiles where id=p_sponsor)||' te invita a su red. Revisa la solicitud antes de aceptar.','info','/dashboard/red');
 return result;
end $$;
create or replace function public.respond_network_request(p_id uuid,p_action text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r network_requests; current_sponsor uuid;
begin
 if auth.uid() is null then raise exception 'Sesión requerida' using errcode='42501';end if;
 perform pg_advisory_xact_lock(834702);
 select * into r from network_requests where id=p_id for update;
 if not found or r.status not in ('pending','review') then raise exception 'La solicitud ya no está pendiente';end if;
 if p_action='cancel' and r.requester_id=auth.uid() then update network_requests set status='cancelled',resolved_at=now() where id=p_id;return;end if;
 if p_action='reject' and (r.member_id=auth.uid() or (r.status='review' and public.network_permission('move_network_member'))) then update network_requests set status='rejected',resolved_at=now(),reviewer_id=auth.uid() where id=p_id;
 elsif (p_action='accept' and r.status='pending' and r.member_id=auth.uid()) or (p_action='approve' and r.status='review' and public.network_permission('move_network_member')) then
  select sponsor_id into current_sponsor from profiles where id=r.member_id for update;
  if current_sponsor is distinct from r.previous_sponsor_id then raise exception 'La red del usuario cambió. Cancela esta solicitud y crea una nueva.';end if;
  if p_action='accept' and current_sponsor is not null then
   update network_requests set status='review' where id=p_id;
   insert into notifications(user_id,title,message,type,link) select id,'Traslado de red por revisar','El usuario aceptó el traslado. Revisa la solicitud en Mi Red.','info','/dashboard/red' from profiles where role='super_admin';
   return;
  end if;
  update profiles set sponsor_id=r.sponsor_id,binary_position=r.position where id=r.member_id;
  update network_requests set status='accepted',resolved_at=now(),reviewer_id=auth.uid() where id=p_id;
 else raise exception 'Acción no permitida' using errcode='42501';end if;
 insert into notifications(user_id,title,message,type,link) values(r.requester_id,'Solicitud de red actualizada',case when p_action='reject' then 'La solicitud fue rechazada.' else 'La afiliación fue completada.' end,'info','/dashboard/red');
end $$;
create or replace function public.network_request_list() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(to_jsonb(t)),'[]') from (select r.*,m.full_name member_name,s.full_name sponsor_name from network_requests r join profiles m on m.id=r.member_id join profiles s on s.id=r.sponsor_id where auth.uid() in(r.member_id,r.requester_id,r.sponsor_id) or (r.status='review' and public.network_permission('move_network_member')) order by r.created_at desc limit 50)t
$$;
create or replace function public.network_tree(p_root uuid) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or (p_root<>auth.uid() and not public.network_permission('view_full_network')) then raise exception 'No puedes consultar esta red' using errcode='42501';end if;
 return (with recursive nodes as(select p.*,0 depth from profiles p where id=p_root union all select p.*,n.depth+1 from profiles p join nodes n on p.sponsor_id=n.id where n.depth<50) select coalesce(jsonb_agg(to_jsonb(t)),'[]') from(select id,username,full_name,case when public.network_permission('view_full_network') or id=auth.uid() then email else null end email,role,rank,plan,status,sponsor_id,binary_position,avatar_url,referral_code,invite_link,created_at,updated_at from nodes)t);
end $$;
-- Existing direct assignment must use the consent workflow too.
create or replace function public.assign_existing_user_to_network(p_user_id uuid,p_sponsor_id uuid,p_position text default 'left') returns json language plpgsql security definer set search_path=public,pg_temp as $$
begin perform public.request_network_membership(p_user_id,p_sponsor_id,p_position);return json_build_object('success',true);exception when others then return json_build_object('success',false,'error',sqlerrm);end $$;
revoke all on function public.search_network_member(text,boolean),public.request_network_membership(uuid,uuid,text),public.respond_network_request(uuid,text),public.network_request_list(),public.network_tree(uuid) from public,anon;
grant execute on function public.search_network_member(text,boolean),public.request_network_membership(uuid,uuid,text),public.respond_network_request(uuid,text),public.network_request_list(),public.network_tree(uuid) to authenticated;
-- Preserve existing implementations while applying the matrix at their entry points.
do $$ declare f record; definition text; begin
 for f in select oid,proname from pg_proc where pronamespace='public'::regnamespace and proname in ('move_user_in_network','add_referral_direct') loop
 definition:=pg_get_functiondef(f.oid);
 if strpos(definition,'v_caller_role IS NULL OR v_caller_role NOT IN (''super_admin'',''admin'')')=0 then
  raise exception 'No se encontró el control de acceso esperado en %',f.proname;
 end if;
 definition:=replace(definition,'v_caller_role IS NULL OR v_caller_role NOT IN (''super_admin'',''admin'')',case when f.proname='move_user_in_network' then 'NOT public.network_permission(''move_network_member'')' else 'NOT public.network_permission(''add_to_network'')' end);
 execute definition;
 end loop;
end $$;
create or replace function public.unlink_network_member(p_user uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.network_permission('remove_from_network') then raise exception 'Sin permiso para desvincular' using errcode='42501';end if;
 update profiles set sponsor_id=null,binary_position=null where id=p_user;
end $$;
revoke all on function public.unlink_network_member(uuid) from public,anon;
grant execute on function public.unlink_network_member(uuid) to authenticated;
create or replace function public.update_network_member(p_user uuid,p_changes jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.network_permission('edit_network_member') then raise exception 'Sin permiso para editar miembros' using errcode='42501';end if;
 if p_changes ? 'rank' and not public.network_permission('configure_system') and (select rank from profiles where id=p_user) is distinct from p_changes->>'rank' then raise exception 'No tienes permiso para asignar rangos';end if;
 update profiles set full_name=coalesce(p_changes->>'full_name',full_name),rank=coalesce(p_changes->>'rank',rank),status=coalesce(p_changes->>'status',status),binary_position=coalesce(p_changes->>'binary_position',binary_position),referral_code=coalesce(nullif(trim(p_changes->>'referral_code'),''),referral_code),invite_link=case when p_changes ? 'invite_link' then nullif(p_changes->>'invite_link','') else invite_link end where id=p_user;
end $$;
revoke all on function public.update_network_member(uuid,jsonb) from public,anon;
grant execute on function public.update_network_member(uuid,jsonb) to authenticated;
-- Direct profile writes must not bypass the authorized network functions.
create or replace function public.guard_sponsor_change() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if current_user not in ('postgres','service_role') and (new.sponsor_id is distinct from old.sponsor_id or new.binary_position is distinct from old.binary_position) then
  raise exception 'Usa las acciones autorizadas de Mi Red para cambiar el patrocinador o la posición' using errcode='42501';
 end if;
 return new;
end $$;
drop trigger if exists guard_sponsor_change on public.profiles;
create trigger guard_sponsor_change before update of sponsor_id,binary_position on public.profiles for each row execute function public.guard_sponsor_change();
