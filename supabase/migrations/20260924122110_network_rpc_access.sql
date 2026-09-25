alter function public.add_referral_direct(uuid,text,text,text,text) set search_path=public,pg_temp;
revoke all on function public.add_referral_direct(uuid,text,text,text,text) from public,anon;
grant execute on function public.add_referral_direct(uuid,text,text,text,text) to authenticated;
