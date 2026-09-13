create table public.account_onboarding (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 default_referral boolean not null default false,
 first_name text, last_name text, email_verified_at timestamptz,
 email_token_hash text, email_token_expires timestamptz, email_sent_at timestamptz
);
alter table public.account_onboarding enable row level security;
revoke all on public.account_onboarding from anon, authenticated;
grant select(user_id,default_referral,first_name,last_name,email_verified_at) on public.account_onboarding to authenticated;
grant all on public.account_onboarding to service_role;
create policy own_onboarding on public.account_onboarding for select to authenticated using(user_id=(select auth.uid()));
insert into public.system_config(key,value,category) values
('register_referral_required','false','registration'),
('register_default_referral_code','GUST001','registration')
on conflict(key) do nothing;
update public.system_config set value='false' where key='register_require_plan';
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
v_username   text;
v_full_name  text;
v_plan       text;
v_ref_code   text;
v_sponsor_id uuid;
v_slug       text;
v_avatar     text;
v_counter    int := 0;
v_plan_raw   text;
v_input_ref text;
v_default_ref text;
v_required boolean;
v_used_default boolean := false;
BEGIN
v_full_name := COALESCE(
NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
split_part(NEW.email, '@', 1)
);
v_username := lower(regexp_replace(
COALESCE(
NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
split_part(NEW.email, '@', 1)
),
'[^a-z0-9_]', '', 'g'
));
IF v_username = '' OR v_username IS NULL THEN v_username := 'user'; END IF;
v_plan_raw := COALESCE(NULLIF(NEW.raw_user_meta_data->>'plan', ''), 'free');
v_plan := 'free';
v_avatar := COALESCE(
NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
NULLIF(TRIM(NEW.raw_user_meta_data->>'picture'), '')
);
v_slug := v_username;
v_counter := 0;
LOOP
EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE slug = v_slug);
v_counter := v_counter + 1;
v_slug := v_username || v_counter::text;
END LOOP;
v_counter := 1;
v_ref_code := upper(left(v_username, 4)) || lpad(v_counter::text, 3, '0');
LOOP
EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_ref_code);
v_counter := v_counter + 1;
v_ref_code := upper(left(v_username, 4)) || lpad(v_counter::text, 3, '0');
END LOOP;

select value='true' into v_required from public.system_config where key='register_referral_required';
select value into v_default_ref from public.system_config where key='register_default_referral_code';
v_input_ref := nullif(upper(trim(NEW.raw_user_meta_data->>'referral_code')), '');
if v_input_ref is null and coalesce(v_required,false) then raise exception 'El código de referido es obligatorio'; end if;
if v_input_ref is null then v_input_ref := nullif(upper(trim(v_default_ref)), ''); v_used_default := true; end if;
if v_input_ref is null then raise exception 'Falta configurar el referido de la empresa'; end if;
select id into v_sponsor_id from public.profiles where upper(referral_code)=v_input_ref and status='active';
if v_sponsor_id is null then raise exception 'Código de referido inválido'; end if;
INSERT INTO public.profiles (
id, username, full_name, email,
role, status, rank, plan,
referral_code, sponsor_id, binary_position,
avatar_url, slug, invite_link,
force_password_change, email_confirmed,
created_at, updated_at
) VALUES (
NEW.id, v_username, v_full_name, NEW.email,
'user', 'active', 'bronze', v_plan,
v_ref_code, v_sponsor_id, 'left',
v_avatar, v_slug, v_ref_code,
false, true,
now(), now()
)
ON CONFLICT (id) DO UPDATE SET
full_name   = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE profiles.full_name END,
email       = EXCLUDED.email,
username    = COALESCE(NULLIF(profiles.username,''), EXCLUDED.username),
slug        = COALESCE(profiles.slug, EXCLUDED.slug),
invite_link = COALESCE(NULLIF(profiles.invite_link,''), EXCLUDED.invite_link),
avatar_url  = CASE WHEN COALESCE(EXCLUDED.avatar_url,'') <> ''
THEN EXCLUDED.avatar_url ELSE profiles.avatar_url END,
force_password_change = false,
updated_at  = now();
insert into public.account_onboarding(user_id, default_referral, first_name, last_name, email_verified_at)
values (NEW.id,v_used_default,trim(NEW.raw_user_meta_data->>'first_name'),trim(NEW.raw_user_meta_data->>'last_name'),
case when NEW.raw_app_meta_data->>'provider'='google' then now() else null end)
on conflict(user_id) do nothing;
RETURN NEW;
END;
$function$;

create or replace function public.change_default_referral(p_code text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare target uuid; me uuid:=auth.uid(); allowed boolean;
begin
 if me is null then raise exception 'Inicia sesión'; end if;
 perform pg_advisory_xact_lock(6132026);
 select default_referral into allowed from public.account_onboarding where user_id=me for update;
 if not coalesce(allowed,false) then raise exception 'Solo puedes reemplazar el referido inicial de la empresa'; end if;
 select id into target from public.profiles where upper(referral_code)=upper(trim(p_code)) and status='active';
 if target is null or target=me then raise exception 'Código de referido inválido'; end if;
 if exists(with recursive tree as (
  select id,sponsor_id,array[id] as path from public.profiles where id=target
  union all select p.id,p.sponsor_id,t.path||p.id from public.profiles p join tree t on p.id=t.sponsor_id where not p.id=any(t.path)
 ) select 1 from tree where id=me) then raise exception 'No puedes elegir un integrante de tu propia red'; end if;
 update public.profiles set sponsor_id=target where id=me;
 update public.account_onboarding set default_referral=false where user_id=me;
end $$;
revoke all on function public.change_default_referral(text) from public, anon;
grant execute on function public.change_default_referral(text) to authenticated;
create or replace function public.guard_sponsor_change() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if current_user not in ('postgres','service_role') and coalesce(public.get_my_role(),'') not in ('admin','super_admin') and new.sponsor_id is distinct from old.sponsor_id then
 raise exception 'Usa la opción de referido en tu perfil';
 end if; return new;
end $$;
create trigger guard_sponsor_change before update of sponsor_id on public.profiles for each row execute function public.guard_sponsor_change();
