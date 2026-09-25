-- Aggregate only data the authenticated role may see; never trust a client role/id.
create or replace function public.account_capabilities()
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare r text; p jsonb;
begin
 select role into r from profiles where id=auth.uid();
 if r is null then raise exception 'Sesión requerida' using errcode='42501'; end if;
 select value::jsonb -> r into p from system_config where key='role_permissions';
 p:=coalesce(p,'{}'::jsonb);
 if r='super_admin' then
 p:=p||'{"view_dashboard":true,"view_reports":true,"export_data":true,"view_users":true,"view_network":true,"view_commissions":true,"manage_orders":true,"approve_commissions":true,"configure_system":true,"manage_mlm_commissions":true}'::jsonb;
 end if;
 return p;
end $$;
revoke all on function public.account_capabilities() from public,anon;
grant execute on function public.account_capabilities() to authenticated;

create or replace function public.account_analytics(p_from timestamptz,p_to timestamptz,p_report boolean default false)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare p jsonb:=public.account_capabilities(); result jsonb; global_orders boolean; global_people boolean; global_commissions boolean;
begin
 if not coalesce((p->>(case when p_report then 'view_reports' else 'view_dashboard' end))::boolean,false) then raise exception 'Tu cargo no tiene acceso a esta vista' using errcode='42501';end if;
 if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>interval '367 days' then raise exception 'Selecciona un período de hasta un año';end if;
 global_orders:=coalesce((p->>'manage_orders')::boolean,false);
 global_people:=coalesce((p->>'view_users')::boolean,false);
 global_commissions:=coalesce((p->>'approve_commissions')::boolean,false);
 with o as materialized (
 select currency,payment_status,status,total,created_at from orders where (global_orders or user_id=auth.uid()) and created_at>=p_from and created_at<p_to
 ), c as materialized (
 select currency,status,amount,created_at from commissions where (global_commissions or user_id=auth.uid()) and (global_commissions or coalesce((p->>'view_commissions')::boolean,false)) and created_at>=p_from and created_at<p_to
 ), u as materialized (
 select status,created_at from profiles where (global_people or (sponsor_id=auth.uid() and coalesce((p->>'view_network')::boolean,false))) and created_at>=p_from and created_at<p_to
 ) select jsonb_build_object(
 'permissions',p,'scope',jsonb_build_object('orders',case when global_orders then 'global' else 'personal' end,'people',case when global_people then 'global' else 'personal' end,'commissions',case when global_commissions then 'global' else 'personal' end),
 'orders',jsonb_build_object('count',(select count(*) from o),'pending',(select count(*) from o where payment_status='pending' and status not in ('cancelled','refunded')),'paid',(select count(*) from o where payment_status='paid' and status not in ('cancelled','refunded'))),
 'people',jsonb_build_object('count',(select count(*) from u),'active',(select count(*) from u where status='active')),
 'money',coalesce((select jsonb_agg(x order by currency) from (
 select currency,sum(sales) sales,sum(earned) earned,sum(pending) pending from (
 select coalesce(currency,'PEN') currency,coalesce(sum(total) filter(where payment_status='paid' and status not in ('cancelled','refunded')),0) sales,0::numeric earned,0::numeric pending from o group by currency
 union all
 select coalesce(currency,'PEN'),0,coalesce(sum(amount) filter(where status in ('approved','paid')),0),coalesce(sum(amount) filter(where status='pending'),0) from c group by currency
 ) v group by currency)x),'[]'::jsonb),
 'monthly',coalesce((select jsonb_agg(x order by month,currency) from (
 select month,currency,sum(sales) sales,sum(earned) earned,sum(orders) orders from (
 select to_char(created_at at time zone 'America/Lima','YYYY-MM') as month,coalesce(currency,'PEN') currency,coalesce(sum(total) filter(where payment_status='paid' and status not in ('cancelled','refunded')),0) sales,0::numeric earned,count(*) orders from o group by 1,2
 union all
 select to_char(created_at at time zone 'America/Lima','YYYY-MM'),coalesce(currency,'PEN'),0,coalesce(sum(amount) filter(where status in ('approved','paid')),0),0 from c group by 1,2
 ) v group by month,currency)x),'[]'::jsonb),
 'registrations',coalesce((select jsonb_agg(x order by month) from (select to_char(created_at at time zone 'America/Lima','YYYY-MM') as month,count(*) count from u group by 1)x),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function public.account_analytics(timestamptz,timestamptz,boolean) from public,anon;
grant execute on function public.account_analytics(timestamptz,timestamptz,boolean) to authenticated;
