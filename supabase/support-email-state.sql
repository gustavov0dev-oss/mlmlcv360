-- Service-only cleanup of the confirmation timestamp produced by a support OTP.
-- The expected timestamp prevents overwriting a subsequent independent confirmation.
create function public.restore_support_email_state(p_user_id uuid,p_expected timestamptz) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 update auth.users set email_confirmed_at=null where id=p_user_id and email_confirmed_at=p_expected;
 return found;
end $$;
revoke all on function public.restore_support_email_state(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.restore_support_email_state(uuid,timestamptz) to service_role;
