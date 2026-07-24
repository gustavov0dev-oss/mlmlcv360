-- 1. Add missing columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_link text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- 2. Fix exchange_rate_usd default
UPDATE system_config SET value = '3.72' WHERE key = 'exchange_rate_usd' AND (value IS NULL OR value = '');

-- 3. Disable maintenance_mode (it was left on accidentally)
UPDATE system_config SET value = 'false' WHERE key = 'maintenance_mode';

-- 4. Improve handle_new_user trigger: set slug, invite_link, avatar from metadata
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
  v_counter int := 0;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_username  := COALESCE(
    NEW.raw_user_meta_data->>'username',
    regexp_replace(lower(split_part(NEW.email, '@', 1)), '[^a-z0-9_]', '', 'g')
  );
  v_plan      := COALESCE(NEW.raw_user_meta_data->>'plan', 'free');

  -- Generate unique slug from username
  v_slug := v_username;
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
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL AND NEW.raw_user_meta_data->>'referral_code' <> '' THEN
    SELECT id INTO v_sponsor_id FROM public.profiles
    WHERE referral_code = UPPER(NEW.raw_user_meta_data->>'referral_code')
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
    v_username,
    v_full_name,
    NEW.email,
    'user', 'active', 'bronze',
    CASE WHEN v_plan = '' THEN 'free' ELSE v_plan END,
    v_referral_code,
    v_sponsor_id,
    'left',
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    v_slug,
    v_referral_code,  -- invite_link = referral_code initially; full URL built in frontend
    true,
    now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    username    = EXCLUDED.username,
    full_name   = EXCLUDED.full_name,
    email       = EXCLUDED.email,
    slug        = EXCLUDED.slug,
    invite_link = EXCLUDED.invite_link,
    avatar_url  = CASE WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url ELSE profiles.avatar_url END,
    updated_at  = now();

  RETURN NEW;
END;
$$;

-- Regenerate slugs for existing profiles that don't have one
UPDATE profiles
SET slug = username, invite_link = referral_code
WHERE slug IS NULL AND username IS NOT NULL;

-- Handle remaining nulls
UPDATE profiles
SET slug = id::text
WHERE slug IS NULL;

-- 5. Add unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS profiles_slug_idx ON profiles(slug);

-- 6. Add RLS service_role policy for transactions insert (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'service_insert_transactions'
  ) THEN
    EXECUTE 'CREATE POLICY "service_insert_transactions" ON transactions FOR INSERT TO service_role WITH CHECK (true)';
  END IF;
END$$;
