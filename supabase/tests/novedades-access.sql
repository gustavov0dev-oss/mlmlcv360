begin;
insert into public.novedades_posts(slug,status,data) values ('codex-test-private-news','draft','{"title":"Access test"}');
set local role anon;
do $$ begin
 if exists(select 1 from public.novedades_posts where slug='codex-test-private-news') then raise exception 'Anonymous draft leak'; end if;
 if not exists(select 1 from public.novedades_posts where status='published') then raise exception 'Published posts inaccessible'; end if;
 begin
 insert into public.novedades_posts(slug,data) values ('codex-test-anon-write','{}');
 raise exception 'Anonymous write accepted';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
do $$ begin
 if exists(select 1 from public.novedades_posts where slug='codex-test-private-news') then raise exception 'Member draft leak'; end if;
 begin
 insert into public.novedades_posts(slug,data) values ('codex-test-member-write','{}');
 raise exception 'Member write accepted';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where role in ('admin','super_admin') limit 1),true);
set local role authenticated;
do $$ begin
 if not public.is_admin_user() then raise exception 'Admin fixture unavailable'; end if;
 update public.novedades_posts set data='{"title":"Updated"}' where slug='codex-test-private-news';
 if not found then raise exception 'Admin update failed'; end if;
 insert into public.novedades_posts(slug,data) values ('codex-test-admin-write','{}');
 delete from public.novedades_posts where slug='codex-test-admin-write';
 if not found then raise exception 'Admin delete failed'; end if;
end $$;
reset role;
rollback;
