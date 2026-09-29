-- Only the owner can end a non-recurring membership. Provider contracts retain
-- their existing cancellation workflow so a local change cannot leave billing live.
create or replace function public.cancel_nonrecurring_membership()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.subscriptions%rowtype;
begin
 if auth.uid() is null then raise exception 'Inicia sesión';end if;
 select * into s from subscriptions where user_id=auth.uid() for update;
 if not found or s.status<>'active' then raise exception 'No tienes una membresía activa';end if;
 if s.auto_renew or exists(select 1 from billing_contracts where user_id=auth.uid() and status in ('active','suspended')) then
  raise exception 'Cancela la renovación a través de tu contrato de pago';
 end if;
 update subscriptions set status='cancelled',auto_renew=false,cancel_at_period_end=false,current_period_end=now(),updated_at=now() where user_id=auth.uid();
 return jsonb_build_object('success',true);
exception when others then return jsonb_build_object('success',false,'error',sqlerrm);
end $$;
revoke all on function public.cancel_nonrecurring_membership() from public,anon;
grant execute on function public.cancel_nonrecurring_membership() to authenticated;
