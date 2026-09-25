create or replace function public.guard_rank_assignment() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if current_user not in ('postgres','service_role') and new.rank is distinct from old.rank and not coalesce((public.account_capabilities()->>'configure_system')::boolean,false) then
 raise exception 'El rango se asigna por sus requisitos o por la administración' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function public.guard_rank_assignment() from public,anon,authenticated;
create trigger guard_rank_assignment before update of rank on public.profiles for each row execute function public.guard_rank_assignment();
