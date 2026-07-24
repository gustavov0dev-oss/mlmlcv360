-- 1. Fix maintenance_mode (left on from previous session)
UPDATE system_config SET value = 'false' WHERE key = 'maintenance_mode';

-- 2. Fix fixer_enabled so it can be toggled from UI (don't force-enable here, just ensure key exists)
INSERT INTO system_config(key, value) VALUES ('fixer_enabled', 'false') ON CONFLICT (key) DO NOTHING;

-- 3. Add impersonate_token table for superadmin impersonation
CREATE TABLE IF NOT EXISTS impersonate_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour')
);
ALTER TABLE impersonate_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin_impersonate" ON impersonate_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = admin_id AND get_my_role() = 'super_admin')
  WITH CHECK (auth.uid() = admin_id AND get_my_role() = 'super_admin');

-- 4. Ensure subscriptions has updated_at (already exists, just safety)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 5. Add RLS policy so service_role trigger can insert profiles freely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'service_role_all_profiles'
  ) THEN
    EXECUTE 'CREATE POLICY "service_role_all_profiles" ON profiles FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END$$;

-- 6. Fix handle_new_user: also capture Google avatar_url from provider metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
  v_full_name text;
  v_plan text;
  v_referral_code text;
  v_sponsor_id uuid;
  v_slug text;
  v_avatar text;
  v_counter int := 0;
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    regexp_replace(lower(split_part(NEW.email, '@', 1)), '[^a-z0-9_]', '', 'g')
  );
  IF v_username = '' THEN v_username := 'user'; END IF;

  v_plan := COALESCE(NULLIF(NEW.raw_user_meta_data->>'plan', ''), 'free');

  -- Google avatar: picture field
  v_avatar := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
    NULLIF(NEW.raw_user_meta_data->>'picture', ''),
    ''
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
  v_referral_code := UPPER(LEFT(v_username, 4)) || LPAD(v_counter::text, 3, '0');
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_referral_code);
    v_counter := v_counter + 1;
    v_referral_code := UPPER(LEFT(v_username, 4)) || LPAD(v_counter::text, 3, '0');
  END LOOP;

  -- Resolve sponsor from referral_code in metadata
  IF (NEW.raw_user_meta_data->>'referral_code') IS NOT NULL
     AND (NEW.raw_user_meta_data->>'referral_code') <> '' THEN
    SELECT id INTO v_sponsor_id
    FROM public.profiles
    WHERE referral_code = UPPER(TRIM(NEW.raw_user_meta_data->>'referral_code'))
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (
    id, username, full_name, email,
    role, status, rank, plan,
    referral_code, sponsor_id, binary_position,
    avatar_url, slug, invite_link,
    email_confirmed, created_at, updated_at
  ) VALUES (
    NEW.id,
    v_username, v_full_name, NEW.email,
    'user', 'active', 'bronze',
    v_plan,
    v_referral_code, v_sponsor_id, 'left',
    v_avatar, v_slug, v_referral_code,
    true, now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name   = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE profiles.full_name END,
    email       = EXCLUDED.email,
    username    = CASE WHEN profiles.username = '' OR profiles.username IS NULL THEN EXCLUDED.username ELSE profiles.username END,
    slug        = CASE WHEN profiles.slug IS NULL THEN EXCLUDED.slug ELSE profiles.slug END,
    invite_link = CASE WHEN profiles.invite_link IS NULL THEN EXCLUDED.invite_link ELSE profiles.invite_link END,
    avatar_url  = CASE WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url ELSE profiles.avatar_url END,
    updated_at  = now();

  RETURN NEW;
END;
$$;
