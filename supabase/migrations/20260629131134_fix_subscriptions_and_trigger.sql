-- Add payment_reference to subscriptions if not exists
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_url text;

-- Ensure unique constraint on user_id (only one active subscription per user)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_key'
  ) THEN
    -- Remove duplicates first keeping the most recent
    DELETE FROM subscriptions a
    USING subscriptions b
    WHERE a.id < b.id AND a.user_id = b.user_id;
    
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END$$;

-- Update handle_new_user to also create free subscription on signup
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

  -- Resolve sponsor
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
    invite_link = COALESCE(profiles.invite_link, EXCLUDED.invite_link),
    avatar_url  = CASE WHEN COALESCE(EXCLUDED.avatar_url,'') <> ''
                       THEN EXCLUDED.avatar_url ELSE profiles.avatar_url END,
    status      = CASE WHEN profiles.status = 'pending' THEN 'active'::user_status ELSE profiles.status END,
    force_password_change = false,
    updated_at  = now();

  -- Auto-create free subscription if plan is free or no paid plan yet
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

-- Create free subscriptions for existing users that don't have one
INSERT INTO subscriptions (user_id, plan_slug, status, current_period_start, current_period_end, gateway, amount, currency, created_at, updated_at)
SELECT p.id, 'free', 'active', now(), now() + interval '100 years', 'free', 0, 'PEN', now(), now()
FROM profiles p
WHERE p.plan = 'free'::mlm_plan
  AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = p.id)
ON CONFLICT (user_id) DO NOTHING;
