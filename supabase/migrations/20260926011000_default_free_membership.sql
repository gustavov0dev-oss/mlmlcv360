-- New accounts only. No existing membership is replaced or paid access granted.
insert into public.system_config(key,value,category,is_sensitive)
values ('register_default_free_plan','','registration',false)
on conflict(key) do nothing;

create or replace function public.assign_registration_membership()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare choice text; selected public.plans%rowtype;
begin
 if new.role <> 'user' or exists(select 1 from system_config where key='system_plans_enabled' and value='false') then return new; end if;
 select coalesce(nullif(raw_user_meta_data->>'membership_choice',''),'default') into choice from auth.users where id=new.id;
 if choice='none' then return new; end if;
 if choice is null or choice='default' then
   select value into choice from system_config where key='register_default_free_plan';
 end if;
 select * into selected from plans where slug=choice and is_active and is_free and price=0;
 if not found then return new; end if;
 insert into subscriptions(user_id,plan_slug,status,current_period_start,current_period_end,gateway,amount,currency)
 values(new.id,selected.slug,'active',now(),case when selected.trial_days>0 then now()+make_interval(days=>selected.trial_days) else null end,'free',0,selected.currency)
 on conflict(user_id) do nothing;
 if found then update profiles set plan=selected.slug where id=new.id; end if;
 return new;
end $$;
revoke all on function public.assign_registration_membership() from public,anon,authenticated;
create or replace trigger assign_registration_membership
after insert on public.profiles for each row execute function public.assign_registration_membership();

-- Administrative invitations must use the same new-account policy, not a
-- hard-coded century-long free subscription. Keep the existing authorization.
do $$
declare original text; revised text;
begin
 select pg_get_functiondef('public.add_referral_direct(uuid,text,text,text,text)'::regprocedure) into original;
 revised := regexp_replace(original, 'INSERT INTO public\.subscriptions\s*\([^;]+ON CONFLICT \(user_id\) DO NOTHING;', '', 'i');
 if revised <> original then execute revised; end if;
end $$;
