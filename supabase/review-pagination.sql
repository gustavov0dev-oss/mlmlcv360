-- Approved-review aggregates: at most ten counters per product, maintained on moderation.
create table if not exists public.product_review_counts (
 product_id uuid not null references public.products(id) on delete cascade,
 rating integer not null check (rating between 1 and 5),
 verified boolean not null,
 total bigint not null default 0 check (total >= 0),
 primary key(product_id,rating,verified)
);
alter table public.product_review_counts enable row level security;
grant select on public.product_review_counts to anon, authenticated;
create policy review_counts_read on public.product_review_counts for select to anon, authenticated using (true);
create schema if not exists private;
create or replace function private.sync_product_review_counts() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if TG_OP = 'UPDATE' and (old.product_id,old.rating,old.verified_purchase,old.status) is not distinct from (new.product_id,new.rating,new.verified_purchase,new.status) then return new; end if;
 if TG_OP <> 'INSERT' and old.status = 'approved' then
   update public.product_review_counts set total=greatest(0,total-1)
   where product_id=old.product_id and rating=old.rating and verified=coalesce(old.verified_purchase,false);
 end if;
 if TG_OP <> 'DELETE' and new.status = 'approved' then
   insert into public.product_review_counts(product_id,rating,verified,total)
   values(new.product_id,new.rating,coalesce(new.verified_purchase,false),1)
   on conflict(product_id,rating,verified) do update set total=product_review_counts.total+1;
 end if;
 return coalesce(new,old);
end $$;
revoke all on function private.sync_product_review_counts() from public,anon,authenticated;
lock table public.product_reviews in share row exclusive mode;
insert into public.product_review_counts(product_id,rating,verified,total)
 select product_id,rating,coalesce(verified_purchase,false),count(*) from public.product_reviews
 where status='approved' group by product_id,rating,coalesce(verified_purchase,false)
 on conflict(product_id,rating,verified) do update set total=excluded.total;
create trigger product_review_counts_sync after insert or update or delete on public.product_reviews
 for each row execute function private.sync_product_review_counts();
create or replace function public.product_review_summary(p_product_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object('total',coalesce(sum(total),0),
 'average',coalesce(sum(total*rating)::numeric/nullif(sum(total),0),0),
 'verified',coalesce(sum(total) filter(where verified),0),
 'stars',jsonb_build_array(
 coalesce(sum(total) filter(where rating=1),0),coalesce(sum(total) filter(where rating=2),0),
 coalesce(sum(total) filter(where rating=3),0),coalesce(sum(total) filter(where rating=4),0),
 coalesce(sum(total) filter(where rating=5),0)))
 from public.product_review_counts where product_id=p_product_id;
$$;
revoke all on function public.product_review_summary(uuid) from public;
grant execute on function public.product_review_summary(uuid) to anon,authenticated;
update public.product_reviews set helpful_count=0 where helpful_count is null;
alter table public.product_reviews alter column helpful_count set default 0;
alter table public.product_reviews alter column helpful_count set not null;
create index if not exists reviews_approved_helpful on public.product_reviews(product_id,helpful_count desc,id desc) where status='approved';
create index if not exists reviews_approved_recent on public.product_reviews(product_id,created_at desc,id desc) where status='approved';
create index if not exists reviews_approved_rating on public.product_reviews(product_id,rating desc,id desc) where status='approved';

create or replace function public.review_report_counts(p_review_ids uuid[]) returns table(review_id uuid,total bigint) language sql stable security invoker set search_path='' as $$ select f.review_id,count(*) from public.review_feedback f where public.is_admin_user() and f.kind='report' and f.review_id=any(p_review_ids) group by f.review_id $$;
revoke all on function public.review_report_counts(uuid[]) from public,anon;
grant execute on function public.review_report_counts(uuid[]) to authenticated;
