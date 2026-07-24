/*
# Harden add_referral_direct with internal admin check

Adds an explicit authorization guard at the top of add_referral_direct so that
even though authenticated users can call it via RPC, only those with admin or
super_admin roles can succeed. Non-admins receive a JSON error response.
*/

CREATE OR REPLACE FUNCTION public.add_referral_direct(
  p_sponsor_id uuid,
  p_full_name  text,
  p_email      text,
  p_username   text,
  p_position   text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_role text;
  v_user_id     uuid;
  v_referral_code text;
  v_counter     int;
BEGIN
  -- Authorization: only admins may call this function
  SELECT role::text INTO v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'No tienes permisos para realizar esta acción');
  END IF;

  -- Check email not already used
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = lower(trim(p_email))) THEN
    RETURN json_build_object('success', false, 'error', 'Ya existe un usuario con ese correo electrónico');
  END IF;

  -- Generate unique referral code
  v_counter := 1;
  LOOP
    v_referral_code := UPPER(LEFT(p_username, 4)) || LPAD(v_counter::text, 3, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_referral_code);
    v_counter := v_counter + 1;
  END LOOP;

  -- Generate new UUID
  v_user_id := gen_random_uuid();

  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at, email_change_confirm_status,
    raw_user_meta_data, raw_app_meta_data,
    created_at, updated_at, is_sso_user, is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated', 'authenticated',
    lower(trim(p_email)),
    crypt('Temp123456!', gen_salt('bf')),
    now(), 0,
    jsonb_build_object(
      'username', p_username,
      'full_name', p_full_name,
      'plan', 'free',
      'referral_code', (SELECT referral_code FROM public.profiles WHERE id = p_sponsor_id)
    ),
    '{}',
    now(), now(), false, false
  );

  -- Insert auth identity
  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at, id
  ) VALUES (
    v_user_id::text,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', lower(trim(p_email))),
    'email',
    now(), now(), now(),
    gen_random_uuid()
  );

  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'referral_code', v_referral_code,
    'message', 'Usuario creado correctamente'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
