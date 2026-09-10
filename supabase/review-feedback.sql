create table if not exists public.review_feedback (
 review_id uuid not null references public.product_reviews(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('helpful','report')),
 created_at timestamptz not null default now(),
 primary key(review_id,user_id,kind)
);
alter table public.review_feedback enable row level security;
grant select on public.review_feedback to authenticated;
create policy feedback_read on public.review_feedback for select to authenticated using(user_id=auth.uid() or public.is_admin_user());
create or replace function public.submit_review_feedback(p_review_id uuid,p_kind text) returns integer
language plpgsql security definer set search_path='' as $$
declare total integer;
begin
 if auth.uid() is null or p_kind not in ('helpful','report') then raise exception 'Acceso no permitido'; end if;
 perform 1 from public.product_reviews where id=p_review_id and status='approved' for update;
 if not found then raise exception 'Reseña no disponible'; end if;
 insert into public.review_feedback(review_id,user_id,kind) values(p_review_id,auth.uid(),p_kind) on conflict do nothing;
 select count(*) into total from public.review_feedback where review_id=p_review_id and kind='helpful';
 update public.product_reviews set helpful_count=total where id=p_review_id;
 return total;
end $$;
revoke all on function public.submit_review_feedback(uuid,text) from public,anon;
grant execute on function public.submit_review_feedback(uuid,text) to authenticated;
