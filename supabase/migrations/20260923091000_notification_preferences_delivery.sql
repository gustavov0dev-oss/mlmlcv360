-- Explicit categories keep payment/security messages mandatory.
alter table public.notifications add column if not exists category text;
create or replace function public.apply_notification_preferences() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare enabled boolean;
begin
 select case new.category when 'new_affiliates' then new_affiliates when 'commissions' then commissions when 'rank_changes' then rank_changes when 'promotions' then promotions else true end into enabled from notification_preferences where user_id=new.user_id;
 if enabled is false then return null;end if;
 if enabled is null and new.category='promotions' then return null;end if;
 return new;
end $$;
create trigger respect_notification_preferences before insert on public.notifications for each row execute function public.apply_notification_preferences();
create or replace function public.notify_network_event() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if tg_op='INSERT' and new.sponsor_id is not null then
 insert into notifications(user_id,title,message,type,link,category) values(new.sponsor_id,'Nuevo referido','Una persona se ha unido a tu red directa.','info','/dashboard/red','new_affiliates');
 elsif tg_op='UPDATE' then
 if old.rank is distinct from new.rank then
 insert into notifications(user_id,title,message,type,link,category) values(new.id,'Tu rango cambió','Consulta tu rango y sus beneficios en tu panel.','success','/dashboard/rangos','rank_changes');
 end if;
 end if;return new;
end $$;
create trigger notify_network_profile after insert or update of rank on public.profiles for each row execute function public.notify_network_event();
create or replace function public.notify_approved_commission() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.status not in ('approved','paid') then return new;end if;
 if tg_op='UPDATE' then if old.status in ('approved','paid') then return new;end if;end if;
 insert into notifications(user_id,title,message,type,link,category) values(new.user_id,'Comisión aprobada','Tienes una nueva comisión aprobada. Consulta el importe y su estado.','success','/dashboard/comisiones','commissions');
 return new;
end $$;
create trigger notify_commission_approval after insert or update of status on public.commissions for each row execute function public.notify_approved_commission();
revoke all on function public.apply_notification_preferences(),public.notify_network_event(),public.notify_approved_commission() from public,anon,authenticated;
