-- Fix gen_salt: add extensions to search_path
-- Fix add_referral_direct: correct search_path, add assign_existing_user capability
-- Add config key for allow_assign_existing_user

-- ── 1. Fix add_referral_direct with correct search_path ───────────────────────
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
SET search_path = public, extensions, auth
AS $$
DECLARE
  v_caller_role   text;
  v_user_id       uuid;
  v_referral_code text;
  v_slug          text;
  v_counter       int;
  v_username_clean text;
BEGIN
  SELECT role::text INTO v_caller_role
  FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin','admin') THEN
    RETURN json_build_object('success', false, 'error', 'No tienes permisos para realizar esta acción');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_sponsor_id) THEN
    RETURN json_build_object('success', false, 'error', 'El patrocinador no existe');
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = lower(trim(p_email))) THEN
    RETURN json_build_object('success', false, 'error', 'Ya existe un usuario con ese correo electrónico');
  END IF;

  v_username_clean := lower(regexp_replace(
    COALESCE(NULLIF(trim(p_username), ''), split_part(p_email, '@', 1)),
    '[^a-z0-9_]', '', 'g'
  ));
  IF v_username_clean = '' THEN v_username_clean := 'user'; END IF;

  v_counter := 1;
  LOOP
    v_referral_code := UPPER(LEFT(v_username_clean, 4)) || LPAD(v_counter::text, 3, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_referral_code);
    v_counter := v_counter + 1;
  END LOOP;

  v_slug := v_username_clean;
  v_counter := 0;
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE slug = v_slug);
    v_counter := v_counter + 1;
    v_slug := v_username_clean || v_counter::text;
  END LOOP;

  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at, email_change_confirm_status,
    raw_user_meta_data, raw_app_meta_data,
    created_at, updated_at, is_sso_user, is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_user_id,
    'authenticated', 'authenticated', lower(trim(p_email)),
    extensions.crypt('Temp123456!', extensions.gen_salt('bf')),
    now(), 0,
    jsonb_build_object('username', v_username_clean, 'full_name', p_full_name, 'plan', 'free'),
    '{}', now(), now(), false, false
  );

  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at, id
  ) VALUES (
    v_user_id::text, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', lower(trim(p_email))),
    'email', now(), now(), now(), gen_random_uuid()
  );

  INSERT INTO public.profiles (
    id, username, full_name, email,
    role, status, rank, plan,
    referral_code, sponsor_id, binary_position,
    avatar_url, slug, invite_link,
    force_password_change, email_confirmed,
    created_at, updated_at
  ) VALUES (
    v_user_id, v_username_clean, p_full_name, lower(trim(p_email)),
    'user'::user_role, 'active'::user_status, 'bronze'::mlm_rank, 'free'::mlm_plan,
    v_referral_code, p_sponsor_id, p_position,
    NULL, v_slug, v_referral_code, true, true, now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    sponsor_id      = p_sponsor_id,
    binary_position = p_position,
    referral_code   = v_referral_code,
    invite_link     = v_referral_code,
    updated_at      = now();

  INSERT INTO public.subscriptions (
    user_id, plan_slug, status, current_period_start, current_period_end,
    gateway, amount, currency, created_at, updated_at
  ) VALUES (
    v_user_id, 'free', 'active', now(), now() + interval '100 years',
    'free', 0, 'PEN', now(), now()
  ) ON CONFLICT (user_id) DO NOTHING;

  RETURN json_build_object(
    'success', true, 'user_id', v_user_id,
    'referral_code', v_referral_code,
    'message', 'Usuario creado correctamente'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ── 2. NEW RPC: assign_existing_user_to_network ───────────────────────────────
-- Allows admin to link an already-registered user into the MLM tree
CREATE OR REPLACE FUNCTION public.assign_existing_user_to_network(
  p_user_id    uuid,
  p_sponsor_id uuid,
  p_position   text DEFAULT 'left'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role::text INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('super_admin','admin') THEN
    RETURN json_build_object('success', false, 'error', 'Sin permisos');
  END IF;

  IF p_user_id = p_sponsor_id THEN
    RETURN json_build_object('success', false, 'error', 'Un usuario no puede patrocinarse a sí mismo');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_sponsor_id) THEN
    RETURN json_build_object('success', false, 'error', 'Patrocinador no encontrado');
  END IF;

  UPDATE public.profiles
  SET sponsor_id = p_sponsor_id,
      binary_position = p_position,
      updated_at = now()
  WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'message', 'Usuario asignado a la red');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ── 3. Fix move_user_in_network search_path ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.move_user_in_network(
  p_user_id        uuid,
  p_new_sponsor_id uuid,
  p_position       text DEFAULT 'left'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role::text INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('super_admin','admin') THEN
    RETURN json_build_object('success', false, 'error', 'Sin permisos');
  END IF;
  IF p_user_id = p_new_sponsor_id THEN
    RETURN json_build_object('success', false, 'error', 'Un usuario no puede ser su propio patrocinador');
  END IF;
  UPDATE public.profiles
  SET sponsor_id = p_new_sponsor_id,
      binary_position = p_position,
      updated_at = now()
  WHERE id = p_user_id;
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ── 4. Add system_config keys for network features ────────────────────────────
INSERT INTO public.system_config (key, value, description, category)
VALUES
  ('allow_assign_existing_user', 'true',  'Permitir al admin asignar usuarios ya registrados a la red', 'network'),
  ('network_max_depth',          '10',    'Profundidad máxima del árbol MLM visible', 'network'),
  ('require_position_selection', 'true',  'Requerir selección de posición (izq/der) al agregar afiliado', 'network')
ON CONFLICT (key) DO NOTHING;
