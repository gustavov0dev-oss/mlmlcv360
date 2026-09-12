alter table public.notifications add column if not exists link text;
create table if not exists public.payment_email_queue (
 id uuid primary key default gen_random_uuid(), session_id uuid not null references public.payment_sessions(id),
 event text not null, user_id uuid not null references public.profiles(id),
 status text not null default 'pending' check(status in ('pending','sending','sent','failed','unknown')),
 created_at timestamptz not null default now(), sent_at timestamptz, unique(session_id,event)
);
alter table public.payment_email_queue enable row level security;
revoke all on public.payment_email_queue from anon,authenticated;
create or replace function public.notify_payment_transition() returns trigger language plpgsql security definer set search_path=public as $$
declare destination text; title_text text; message_text text;
begin
 if new.status is not distinct from old.status or new.status not in ('review','paid','rejected') then return new; end if;
 destination := '/pago?session='||new.id;
 if new.status='review' then
  insert into notifications(user_id,title,message,type,link)
  select id,'Comprobante pendiente de revisión','Se recibió un comprobante de '||new.currency||' '||new.amount||'. Revisa y confirma el pago.','warning','/dashboard/admin/pedidos'
  from profiles where role in ('admin','super_admin');
  title_text:='Comprobante recibido'; message_text:='Tu comprobante está en revisión. Te avisaremos cuando termine.';
 elsif new.status='paid' then
  title_text:='Pago confirmado';message_text:='Tu pago fue confirmado. Ya puedes consultar tus beneficios o tu pedido.';
  if new.order_id is not null then destination:='/dashboard/pedidos/factura/'||new.order_id; end if;
 else title_text:='Comprobante rechazado';message_text:='No se pudo aprobar tu comprobante. Revisa tu pago o contacta con soporte.';
 end if;
 insert into notifications(user_id,title,message,type,link) values(new.user_id,title_text,message_text,case when new.status='paid' then 'success' else 'info' end,destination);
 insert into payment_email_queue(session_id,event,user_id) values(new.id,new.status,new.user_id) on conflict do nothing;
 return new;
end $$;
drop trigger if exists payment_transition_notifications on public.payment_sessions;
create trigger payment_transition_notifications after update of status on public.payment_sessions for each row execute function public.notify_payment_transition();
create or replace function public.notify_subscription_cancelled() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status='cancelled' and old.status is distinct from new.status then
 insert into notifications(user_id,title,message,type,link) values(new.user_id,'Renovación cancelada','No habrá nuevos cobros. Consulta en Mi Plan la fecha hasta la que mantienes tus beneficios.','info','/dashboard/mi-plan');
 end if;return new;
end $$;
drop trigger if exists subscription_cancel_notification on public.billing_contracts;
create trigger subscription_cancel_notification after update of status on public.billing_contracts for each row execute function public.notify_subscription_cancelled();
