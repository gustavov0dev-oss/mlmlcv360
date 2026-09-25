-- Repair only legacy free/trial periods; never replace valid purchased periods.
create or replace function public.normalize_legacy_free_period() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare days integer;
begin
 if new.gateway='free' and new.current_period_start is not null and (new.current_period_end is null or new.current_period_end>new.current_period_start+interval '50 years') then
  select trial_days into days from plans where slug=new.plan_slug and (is_free or price=0);
  if days>0 then new.current_period_end:=new.current_period_start+make_interval(days=>days); end if;
 end if;
 if new.gateway='free' and new.status='active' and new.current_period_end<=now() then new.status:='expired';end if;
 return new;
end $$;
revoke all on function public.normalize_legacy_free_period() from public,anon,authenticated;
create trigger normalize_legacy_free_period before insert or update of current_period_start,current_period_end,plan_slug on public.subscriptions for each row execute function public.normalize_legacy_free_period();
update public.subscriptions s set current_period_end=s.current_period_start+make_interval(days=>p.trial_days),updated_at=now()
from public.plans p where p.slug=s.plan_slug and (p.is_free or p.price=0) and p.trial_days>0 and s.gateway='free' and s.current_period_start is not null and (s.current_period_end is null or s.current_period_end>s.current_period_start+interval '50 years');

-- Same server-derived permissions as dashboard; no caller-supplied identity or scope.
create or replace function public.account_report_breakdowns(p_from timestamptz,p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare p jsonb:=public.account_capabilities(); go boolean:=coalesce((p->>'manage_orders')::boolean,false); gc boolean:=coalesce((p->>'approve_commissions')::boolean,false); gu boolean:=coalesce((p->>'view_users')::boolean,false); result jsonb;
begin
 if not coalesce((p->>'view_reports')::boolean,false) then raise exception 'Acceso no permitido' using errcode='42501';end if;
 if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>interval '367 days' then raise exception 'Selecciona hasta un año';end if;
 with o as materialized(select * from orders where (go or user_id=auth.uid()) and created_at>=p_from and created_at<p_to),
 c as materialized(select * from commissions where (gc or user_id=auth.uid()) and (gc or coalesce((p->>'view_commissions')::boolean,false)) and created_at>=p_from and created_at<p_to),
 u as materialized(select * from profiles where (gu or (sponsor_id=auth.uid() and coalesce((p->>'view_network')::boolean,false))) and created_at>=p_from and created_at<p_to)
 select jsonb_build_object(
 'order_status',coalesce((select jsonb_agg(x) from (select status label,coalesce(currency,'PEN') currency,count(*) count,sum(total) amount from o group by 1,2 order by 1,2)x),'[]'::jsonb),
 'payments',coalesce((select jsonb_agg(x) from (select coalesce(payment_method,'Sin método') label,coalesce(currency,'PEN') currency,count(*) count,sum(total) amount from o where payment_status='paid' and status not in ('cancelled','refunded') group by 1,2 order by 4 desc)x),'[]'::jsonb),
 'products',coalesce((select jsonb_agg(x) from (select i.product_name label,coalesce(o.currency,'PEN') currency,sum(i.quantity) count,sum(i.total) amount from order_items i join o on o.id=i.order_id where o.payment_status='paid' and o.status not in ('cancelled','refunded') group by i.product_id,i.product_name,o.currency order by 4 desc)x),'[]'::jsonb),
 'commission_status',coalesce((select jsonb_agg(x) from (select status label,coalesce(currency,'PEN') currency,count(*) count,sum(amount) amount from c group by 1,2 order by 1)x),'[]'::jsonb),
 'commission_types',coalesce((select jsonb_agg(x) from (select type label,coalesce(currency,'PEN') currency,count(*) count,sum(amount) amount from c where status in ('approved','paid') group by 1,2 order by 4 desc)x),'[]'::jsonb),
 'ranks',coalesce((select jsonb_agg(x) from (select coalesce(r.name,u.rank,'Sin rango') label,count(*) count from u left join ranks r on r.slug=u.rank group by 1 order by 2 desc)x),'[]'::jsonb),
 'memberships',coalesce((select jsonb_agg(x) from (select coalesce(pl.name,s.plan_slug) label,case when s.current_period_end<=now() then 'expired' else s.status end status,count(*) count from subscriptions s left join plans pl on pl.slug=s.plan_slug where (coalesce((p->>'configure_system')::boolean,false) or s.user_id=auth.uid()) and s.current_period_start>=p_from and s.current_period_start<p_to group by 1,2 order by 1)x),'[]'::jsonb)
 ) into result;return result;
end $$;
revoke all on function public.account_report_breakdowns(timestamptz,timestamptz) from public,anon;
grant execute on function public.account_report_breakdowns(timestamptz,timestamptz) to authenticated;
