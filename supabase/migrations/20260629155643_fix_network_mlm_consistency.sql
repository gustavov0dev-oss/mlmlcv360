/*
  Fix MLM network consistency:
  1. add_referral_direct: inserts profile directly (bypasses trigger ambiguity),
     uses p_sponsor_id and p_position correctly, generates referral_code + invite_link.
  2. handle_new_user: generates invite_link from referral_code automatically.
  3. Backfill invite_link for profiles that are missing it.
  4. Add index on sponsor_id for tree queries.
*/

-- ── 1. Backfill invite_link for profiles missing it ────────────────────────────
UPDATE public.profiles
SET invite_link = referral_code
WHERE (invite_link IS NULL OR invite_link = '')
  AND referral_code IS NOT NULL AND referral_code <> '';

-- ── 2. Update handle_new_user to always generate invite_link ──────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username   text;
  v_full_name  text;
  v_plan       mlm_plan;
  v_ref_code   text;
  v_sponsor_id uuid;
  v_slug       text;
  v_avatar     text;
  v_counter    int := 0;
  v_plan_raw   text;
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
  BEGIN
    v_plan := v_plan_raw::mlm_plan;
  EXCEPTION WHEN invalid_text_representation THEN
    v_plan := 'free'::mlm_plan;
  END;

  v_avatar := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'picture'), '')
  );

  -- Generate unique slug
  v_slug := v_username;
  v_counter := 0;
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE slug = v_slug);
    v_counter := v_counter + 1;
    v_slug := v_username || v_counter::text;
  END LOOP;

  -- Generate unique referral_code
  v_counter := 1;
  v_ref_code := upper(left(v_username, 4)) || lpad(v_counter::text, 3, '0');
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_ref_code);
    v_counter := v_counter + 1;
    v_ref_code := upper(left(v_username, 4)) || lpad(v_counter::text, 3, '0');
  END LOOP;

  -- Resolve sponsor from referral_code in metadata
  IF (NEW.raw_user_meta_data->>'referral_code') IS NOT NULL
     AND (NEW.raw_user_meta_data->>'referral_code') <> '' THEN
    SELECT id INTO v_sponsor_id
    FROM public.profiles
    WHERE referral_code = upper(trim(NEW.raw_user_meta_data->>'referral_code'))
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (
    id, username, full_name, email,
    role, status, rank, plan,
    referral_code, sponsor_id, binary_position,
    avatar_url, slug, invite_link,
    force_password_change, email_confirmed,
    created_at, updated_at
  ) VALUES (
    NEW.id, v_username, v_full_name, NEW.email,
    'user'::user_role, 'active'::user_status, 'bronze'::mlm_rank, v_plan,
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
    status      = CASE WHEN profiles.status = 'pending' THEN 'active'::user_status ELSE profiles.status END,
    force_password_change = false,
    updated_at  = now();

  -- Auto-create free subscription
  IF v_plan = 'free'::mlm_plan THEN
    INSERT INTO public.subscriptions (
      user_id, plan_slug, status,
      current_period_start, current_period_end,
      gateway, amount, currency, created_at, updated_at
    ) VALUES (
      NEW.id, 'free', 'active',
      now(), now() + interval '100 years',
      'free', 0, 'PEN', now(), now()
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 3. Fix add_referral_direct: write profile directly, bypass trigger ambiguity ─
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
  v_caller_role   text;
  v_user_id       uuid;
  v_referral_code text;
  v_slug          text;
  v_counter       int;
  v_username_clean text;
BEGIN
  -- Authorization: only admins or the sponsor themselves
  SELECT role::text INTO v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'No tienes permisos para realizar esta acción');
  END IF;

  -- Validate sponsor exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_sponsor_id) THEN
    RETURN json_build_object('success', false, 'error', 'El patrocinador no existe');
  END IF;

  -- Check email not already used
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = lower(trim(p_email))) THEN
    RETURN json_build_object('success', false, 'error', 'Ya existe un usuario con ese correo electrónico');
  END IF;

  -- Clean username
  v_username_clean := lower(regexp_replace(
    COALESCE(NULLIF(trim(p_username), ''), split_part(p_email, '@', 1)),
    '[^a-z0-9_]', '', 'g'
  ));
  IF v_username_clean = '' THEN v_username_clean := 'user'; END IF;

  -- Generate unique referral_code
  v_counter := 1;
  LOOP
    v_referral_code := UPPER(LEFT(v_username_clean, 4)) || LPAD(v_counter::text, 3, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_referral_code);
    v_counter := v_counter + 1;
  END LOOP;

  -- Generate unique slug
  v_slug := v_username_clean;
  v_counter := 0;
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE slug = v_slug);
    v_counter := v_counter + 1;
    v_slug := v_username_clean || v_counter::text;
  END LOOP;

  -- Generate new UUID
  v_user_id := gen_random_uuid();

  -- Insert into auth.users (trigger will fire handle_new_user)
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
      'username', v_username_clean,
      'full_name', p_full_name,
      'plan', 'free'
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

  -- Override sponsor_id, binary_position, and referral_code set by the trigger
  -- (trigger fires on INSERT into auth.users but may race; we upsert here to be sure)
  UPDATE public.profiles
  SET
    sponsor_id      = p_sponsor_id,
    binary_position = p_position,
    referral_code   = v_referral_code,
    invite_link     = v_referral_code,
    slug            = v_slug,
    updated_at      = now()
  WHERE id = v_user_id;

  -- If trigger hasn't run yet, do a direct insert (ON CONFLICT handles the race)
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
    NULL, v_slug, v_referral_code,
    true, true,
    now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    sponsor_id      = p_sponsor_id,
    binary_position = p_position,
    referral_code   = v_referral_code,
    invite_link     = v_referral_code,
    updated_at      = now();

  -- Auto-create free subscription
  INSERT INTO public.subscriptions (
    user_id, plan_slug, status,
    current_period_start, current_period_end,
    gateway, amount, currency, created_at, updated_at
  ) VALUES (
    v_user_id, 'free', 'active',
    now(), now() + interval '100 years',
    'free', 0, 'PEN', now(), now()
  )
  ON CONFLICT (user_id) DO NOTHING;

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

-- ── 4. RPC: move_user_in_network (superadmin: reasignar sponsor) ──────────────
CREATE OR REPLACE FUNCTION public.move_user_in_network(
  p_user_id    uuid,
  p_new_sponsor_id uuid,
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
  SELECT role::text INTO v_caller_role
  FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('super_admin', 'admin') THEN
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

-- ── 5. Index for tree traversal ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_sponsor_id ON public.profiles(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
