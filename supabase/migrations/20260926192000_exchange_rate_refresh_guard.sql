-- A shared 24-hour guard prevents repeated Fixer calls across browsers/users.
create or replace function public.claim_exchange_rate_refresh()
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare claimed boolean;
begin
 insert into system_config(key,value,category,is_sensitive,updated_at)
 values('exchange_rate_last_attempt',now()::text,'currency',false,now())
 on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at
 where system_config.value::timestamptz < now()-interval '24 hours';
 claimed:=found;
 return claimed;
end $$;
revoke all on function public.claim_exchange_rate_refresh() from public,anon,authenticated;
grant execute on function public.claim_exchange_rate_refresh() to service_role;
