create or replace function public.complete_payment_session(p_id uuid) returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare s payment_sessions%rowtype;
begin
 select * into s from payment_sessions where id=p_id for update;
 if not found then raise exception 'Pago no encontrado'; end if;
 if s.status='paid' then return; end if;
 if s.status='rejected' then raise exception 'Pago rechazado'; end if;
 if s.order_id is not null then
  update orders set payment_status='paid',payment_reference=coalesce(s.provider_id,s.operation_reference,s.id::text),updated_at=now() where id=s.order_id;
 else
  insert into subscriptions(user_id,plan_slug,status,current_period_start,current_period_end,gateway,amount,currency,payment_reference,updated_at,auto_renew,cancel_at_period_end,contract_id)
  values(s.user_id,s.plan_slug,'active',now(),now()+interval '1 month',s.gateway,s.amount,s.currency,s.id::text,now(),false,false,null)
  on conflict(user_id) do update set plan_slug=excluded.plan_slug,status='active',current_period_start=excluded.current_period_start,current_period_end=excluded.current_period_end,gateway=excluded.gateway,amount=excluded.amount,currency=excluded.currency,payment_reference=excluded.payment_reference,updated_at=now(),auto_renew=false,cancel_at_period_end=false,contract_id=null;
  update profiles set plan=s.plan_slug,updated_at=now() where id=s.user_id;
 end if;
 insert into transactions(user_id,plan_slug,order_id,amount,currency,gateway,transaction_id,status) values(s.user_id,s.plan_slug,s.order_id,s.amount,s.currency,s.gateway,s.id::text,'completed');
 update payment_sessions set status='paid',paid_at=now() where id=s.id;
end $$;
