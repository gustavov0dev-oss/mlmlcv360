-- SQL Editor / postgres only. Everything, including Auth fixtures, is rolled back.
begin;
do $$
declare r jsonb; uid uuid; actor uuid; free_slug text;
begin
 select id into actor from public.profiles where role='super_admin' and status='active' limit 1;
 if actor is null then raise exception 'No administrator available for test';end if;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 r:=public.admin_create_account('qa_'||gen_random_uuid()::text||'@example.invalid','QA rollback only','qa_'||replace(gen_random_uuid()::text,'-',''),'user','active','',null,'none',null);
 if r->>'success'<>'true' then raise exception 'Create failed: %',r->>'error';end if;
 uid:=(r->>'user_id')::uuid;
 if not exists(select 1 from public.profiles where id=uid and rank='' and force_password_change) then raise exception 'Profile defaults failed';end if;
 if exists(select 1 from public.subscriptions where user_id=uid) then raise exception 'Unrequested membership created';end if;
 if not exists(select 1 from auth.identities where user_id=uid and provider='email') then raise exception 'Identity missing';end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 r:=public.admin_create_account('forbidden@example.invalid','Forbidden','forbidden');
 if r->>'success'<>'false' then raise exception 'Permission guard failed';end if;
 r:=public.cancel_nonrecurring_membership();
 if r->>'success'<>'false' then raise exception 'Missing membership guard failed';end if;
 select slug into free_slug from public.plans where is_active and is_free and price=0 limit 1;
 if free_slug is null then raise exception 'No free plan available for test';end if;
 update public.plans set free_once_per_user=true where slug=free_slug;
 r:=public.activate_free_membership(free_slug);
 if r->>'success'<>'true' then raise exception 'Activation failed: %',r->>'error';end if;
 r:=public.cancel_nonrecurring_membership();
 if r->>'success'<>'true' then raise exception 'Cancellation failed: %',r->>'error';end if;
 r:=public.activate_free_membership(free_slug);
 if r->>'success'<>'false' then raise exception 'One-time limit failed';end if;
 update public.plans set free_once_per_user=false where slug=free_slug;
 r:=public.activate_free_membership(free_slug);
 if r->>'success'<>'true' then raise exception 'Repeat activation failed: %',r->>'error';end if;
end $$;
select 'PASS: account, defaults, identity, permissions, activation, cancellation, one-time and repeat limits. All fixtures rolled back.' as result;
rollback;
