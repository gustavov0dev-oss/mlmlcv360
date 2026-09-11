drop policy if exists users_update_own_sub on public.subscriptions;
drop policy if exists users_upsert_own_sub on public.subscriptions;
drop policy if exists user_orders_i on public.orders;
create or replace function public.guard_profile_plan() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if current_user not in ('postgres','service_role') and coalesce(public.get_my_role(),'') not in ('admin','super_admin') then
  if TG_OP='UPDATE' and new.plan is distinct from old.plan then raise exception 'El plan solo cambia tras confirmar el pago'; end if;
  if TG_OP='INSERT' and exists(select 1 from public.plans where slug=new.plan and price>0) then raise exception 'Este plan requiere un pago confirmado'; end if;
 end if;
 return new;
end $$;
create trigger guard_profile_plan before insert or update of plan on public.profiles for each row execute function public.guard_profile_plan();
