alter table public.novedades_posts add column view_count bigint not null default 0;
create table public.novedades_view_events (
 post_id uuid not null references public.novedades_posts(id) on delete cascade,
 visitor_id uuid not null,
 viewed_on date not null default current_date,
 primary key(post_id,visitor_id,viewed_on)
);
alter table public.novedades_view_events enable row level security;
revoke all on public.novedades_view_events from anon,authenticated;
create function public.record_novedad_view(p_post_id uuid,p_visitor_id uuid) returns bigint
language plpgsql security definer set search_path = '' as $$
declare added integer; total bigint;
begin
 if p_visitor_id is null then return null; end if;
 perform 1 from public.novedades_posts where id=p_post_id and status='published' for update;
 if not found then return null; end if;
 insert into public.novedades_view_events(post_id,visitor_id) values(p_post_id,p_visitor_id) on conflict do nothing;
 get diagnostics added = row_count;
 update public.novedades_posts set view_count=view_count+added where id=p_post_id returning view_count into total;
 return total;
end $$;
revoke all on function public.record_novedad_view(uuid,uuid) from public;
grant execute on function public.record_novedad_view(uuid,uuid) to anon,authenticated;
