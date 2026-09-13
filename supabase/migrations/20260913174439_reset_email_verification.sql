create or replace function public.reset_account_email_verification() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.email is distinct from old.email then
 update public.account_onboarding set email_verified_at=null,email_token_hash=null,email_token_expires=null,email_sent_at=null where user_id=new.id;
 end if;
 return new;
end $$;
revoke all on function public.reset_account_email_verification() from public,anon,authenticated;
create trigger reset_account_email_verification after update of email on auth.users for each row execute function public.reset_account_email_verification();
