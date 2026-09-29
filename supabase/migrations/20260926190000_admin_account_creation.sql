-- Atomic account creation. Membership choice is consumed by the signup trigger.
create or replace function public.admin_create_account(
 p_email text,p_full_name text,p_username text,p_role text default 'user',
 p_status text default 'active',p_rank text default '',p_phone text default null,
 p_membership text default 'default',p_password text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=gen_random_uuid(); secret text; ref text; caller text; v_username text; result jsonb;
begin
 select role into caller from profiles where id=auth.uid();
 if auth.uid() is null or not public.network_permission('add_to_network') or not coalesce((public.account_capabilities()->>'view_users')::boolean,false) then raise exception 'No tienes permiso para crear usuarios' using errcode='42501'; end if;
 if caller<>'super_admin' and p_role<>'user' then raise exception 'Solo el superadministrador puede asignar cargos al crear una cuenta';end if;
 if p_role is null or (p_role not in ('user','super_admin','admin','inspector','support') and not exists(select 1 from custom_roles where name=p_role)) then raise exception 'Rol inválido';end if;
 if p_membership is null then raise exception 'Indica la política de membresía';end if;
 if p_status not in ('active','suspended','pending') then raise exception 'Estado inválido';end if;
 if length(trim(p_full_name))<2 or trim(p_email)!~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Revisa el nombre y el correo';end if;
 if exists(select 1 from auth.users where lower(email)=lower(trim(p_email))) then raise exception 'Ya existe una cuenta con este correo';end if;
 if coalesce(p_rank,'')<>'' and (not coalesce((public.account_capabilities()->>'configure_system')::boolean,false) or not exists(select 1 from ranks where slug=p_rank and is_active)) then raise exception 'No puedes asignar ese rango';end if;
 if p_membership not in ('default','none') and not exists(select 1 from plans where slug=p_membership and is_active and is_free and price=0) then raise exception 'Solo se puede activar un plan gratuito. Los planes de pago requieren contratación y pago confirmado';end if;
 select value into ref from system_config where key='register_default_referral_code';
 if not exists(select 1 from profiles where upper(referral_code)=upper(trim(ref)) and status='active') then raise exception 'Configura un referido de empresa activo en Administración → Registro';end if;
 secret:=coalesce(nullif(p_password,''),encode(extensions.gen_random_bytes(18),'hex'));
 if length(secret)<12 then raise exception 'La contraseña debe tener al menos 12 caracteres';end if;
 v_username:=lower(regexp_replace(trim(p_username),'[^a-zA-Z0-9_]','','g'));
 if v_username='' then raise exception 'Ingresa un nombre de usuario válido';end if;
 if exists(select 1 from profiles where username=v_username) then raise exception 'Este nombre de usuario ya está ocupado';end if;
 insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,email_change_confirm_status,raw_user_meta_data,raw_app_meta_data,created_at,updated_at,is_sso_user,is_anonymous)
 values('00000000-0000-0000-0000-000000000000',uid,'authenticated','authenticated',lower(trim(p_email)),extensions.crypt(secret,extensions.gen_salt('bf')),now(),0,jsonb_build_object('username',v_username,'full_name',trim(p_full_name),'referral_code',ref,'membership_choice',p_membership),'{}',now(),now(),false,false);
 insert into auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at,id)
 values(uid::text,uid,jsonb_build_object('sub',uid::text,'email',lower(trim(p_email))),'email',now(),now(),now(),gen_random_uuid());
 update profiles set username=v_username,role=p_role,status=p_status::public.user_status,rank=coalesce(p_rank,''),phone=nullif(trim(p_phone),''),force_password_change=true where id=uid;
 if not found then raise exception 'No se pudo completar el perfil';end if;
 result:=jsonb_build_object('success',true,'user_id',uid,'temporary_password',case when nullif(p_password,'') is null then secret else null end);
 return result;
exception when others then return jsonb_build_object('success',false,'error',sqlerrm);
end $$;
revoke all on function public.admin_create_account(text,text,text,text,text,text,text,text,text) from public,anon;
grant execute on function public.admin_create_account(text,text,text,text,text,text,text,text,text) to authenticated;
