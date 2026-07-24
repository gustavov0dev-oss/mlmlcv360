-- Fix column defaults now that 'free' enum value is committed
ALTER TABLE profiles ALTER COLUMN status SET DEFAULT 'active'::user_status;
ALTER TABLE profiles ALTER COLUMN plan SET DEFAULT 'free'::mlm_plan;
ALTER TABLE profiles ALTER COLUMN force_password_change SET DEFAULT false;

-- Create avatars storage bucket (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/gif','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatars_upload' AND tablename = 'objects') THEN
    EXECUTE 'CREATE POLICY avatars_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = ''avatars'' AND (storage.foldername(name))[1] = auth.uid()::text)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatars_update' AND tablename = 'objects') THEN
    EXECUTE 'CREATE POLICY avatars_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = ''avatars'' AND (storage.foldername(name))[1] = auth.uid()::text)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatars_public_read' AND tablename = 'objects') THEN
    EXECUTE 'CREATE POLICY avatars_public_read ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = ''avatars'')';
  END IF;
END$$;

-- Fix existing users: active + no forced password change
UPDATE profiles SET 
  status = 'active',
  force_password_change = false
WHERE status = 'pending' OR force_password_change = true;

-- Fix 'inicio' → 'free' for users without active paid subscription
UPDATE profiles p SET plan = 'free'::mlm_plan
WHERE p.plan = 'inicio'::mlm_plan
  AND NOT EXISTS (
    SELECT 1 FROM subscriptions s 
    WHERE s.user_id = p.id AND s.status = 'active'
  );

-- Improved handle_new_user trigger
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

  -- Validate plan value against enum
  v_plan_raw := COALESCE(NULLIF(NEW.raw_user_meta_data->>'plan', ''), 'free');
  BEGIN
    v_plan := v_plan_raw::mlm_plan;
  EXCEPTION WHEN invalid_text_representation THEN
    v_plan := 'free'::mlm_plan;
  END;

  -- Avatar from Google OAuth or manual
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

  -- Resolve sponsor from referral_code
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

  RETURN NEW;
END;
$$;
