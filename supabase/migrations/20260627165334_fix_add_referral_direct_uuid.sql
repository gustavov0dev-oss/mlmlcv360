-- Fix add_referral_direct: replace uuid_generate_v4() with gen_random_uuid()
CREATE OR REPLACE FUNCTION public.add_referral_direct(
  p_sponsor_id uuid,
  p_full_name text,
  p_email text,
  p_username text,
  p_position text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_referral_code text;
  v_counter int;
BEGIN
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
      'plan', 'inicio'
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
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', lower(trim(p_email)),
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(), now(), now(),
    gen_random_uuid()
  );

  -- Update profile set by trigger: assign sponsor + position
  UPDATE public.profiles SET
    sponsor_id     = p_sponsor_id,
    binary_position = p_position,
    force_password_change = true,
    referral_code  = v_referral_code
  WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'user_id', v_user_id);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
