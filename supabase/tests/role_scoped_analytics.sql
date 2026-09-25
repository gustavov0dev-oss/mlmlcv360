begin;
do $$
declare uid uuid; result jsonb; expected bigint;
begin
 select id into uid from profiles where role='user' limit 1;
 if uid is null then raise exception 'Requires a user fixture';end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 result:=account_analytics(now()-interval '30 days',now(),true);
 select count(*) into expected from orders where user_id=uid and created_at>=now()-interval '30 days' and created_at<now();
 if (result#>>'{orders,count}')::bigint<>expected or result#>>'{scope,orders}'<>'personal' then raise exception 'Personal scope leaked';end if;
 update profiles set role='support' where id=uid;
 result:=account_analytics(now()-interval '30 days',now(),true);
 if result#>>'{scope,people}'<>'global' or result#>>'{scope,orders}'<>'personal' then raise exception 'Support scope failed';end if;
 update profiles set role='caporal' where id=uid;
 result:=account_analytics(now()-interval '30 days',now(),true);
 if (result#>>'{people,count}')::int<>0 then raise exception 'Custom role leaked';end if;
 perform set_config('request.jwt.claim.sub','',true);
 begin perform account_analytics(now()-interval '30 days',now(),true);raise exception 'Anonymous access';exception when insufficient_privilege then null;end;
end $$;
rollback;
