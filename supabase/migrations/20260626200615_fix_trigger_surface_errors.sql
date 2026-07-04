-- Debug: replace handle_new_user to surface the actual error
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
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
  v_generated_code text;
  v_counter int;
BEGIN
  v_username := NEW.raw_user_meta_data->>'username';
  v_full_name := NEW.raw_user_meta_data->>'full_name';
  v_plan := COALESCE(NEW.raw_user_meta_data->>'plan', 'inicio');
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';

  IF v_username IS NOT NULL THEN
    v_counter := 1;
    LOOP
      v_generated_code := UPPER(LEFT(v_username, 4)) || LPAD(v_counter::text, 3, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_generated_code);
      v_counter := v_counter + 1;
    END LOOP;
  ELSE
    v_generated_code := 'USER' || UPPER(SUBSTRING(NEW.id::text, 1, 3));
  END IF;

  IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
    SELECT id INTO v_sponsor_id FROM public.profiles WHERE referral_code = UPPER(v_referral_code) LIMIT 1;
  END IF;

  INSERT INTO public.profiles (
    id, email, username, full_name, plan, referral_code, sponsor_id,
    status, role, rank, email_confirmed, force_password_change
  ) VALUES (
    NEW.id, NEW.email,
    COALESCE(v_username, split_part(NEW.email, '@', 1)),
    COALESCE(v_full_name, v_username, NEW.email),
    v_plan, v_generated_code, v_sponsor_id,
    'active', 'user', 'bronze', true, false
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (NEW.id, '¡Bienvenido a MLM 360!', 'Tu cuenta ha sido creada exitosamente. Comienza a construir tu red ahora mismo.', 'success')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
