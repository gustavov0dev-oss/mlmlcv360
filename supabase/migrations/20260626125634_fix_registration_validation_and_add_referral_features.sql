/*
# Fix registration: validate duplicates, add plan purchase tracking
# Add mark_notification_read function
# Add referral_links table for tracking referral invitations
*/

-- ── 1. Add unique constraint on email in profiles ──
-- (username already has unique constraint)
-- email is not unique in profiles because auth.users has it. 
-- But we need to check duplicates during registration from the frontend.

-- ── 2. Add function to check if username/email exists ──
CREATE OR REPLACE FUNCTION public.check_user_exists(p_username text, p_email text)
RETURNS TABLE(username_exists boolean, email_exists boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    EXISTS(SELECT 1 FROM public.profiles WHERE username = LOWER(p_username)) as username_exists,
    EXISTS(SELECT 1 FROM public.profiles WHERE email = LOWER(p_email)) as email_exists;
$$;

-- ── 3. Add function to mark notification as read ──
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications SET read = true WHERE id = p_notification_id;
$$;

-- ── 4. Add function to mark all notifications as read ──
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications SET read = true WHERE user_id = p_user_id AND read = false;
$$;

-- ── 5. Add plan_orders table for tracking plan purchases ──
CREATE TABLE IF NOT EXISTS public.plan_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'inicio',
  amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  payment_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.plan_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_plan_orders" ON public.plan_orders;
CREATE POLICY "select_own_plan_orders" ON public.plan_orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_plan_orders" ON public.plan_orders;
CREATE POLICY "insert_own_plan_orders" ON public.plan_orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_plan_orders" ON public.plan_orders;
CREATE POLICY "update_own_plan_orders" ON public.plan_orders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_plan_orders" ON public.plan_orders;
CREATE POLICY "delete_own_plan_orders" ON public.plan_orders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ── 6. Add referral_links table for tracking referral invitations ──
CREATE TABLE IF NOT EXISTS public.referral_links (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  label text,
  clicks integer NOT NULL DEFAULT 0,
  signups integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.referral_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_referral_links" ON public.referral_links;
CREATE POLICY "select_own_referral_links" ON public.referral_links FOR SELECT
  TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "insert_own_referral_links" ON public.referral_links;
CREATE POLICY "insert_own_referral_links" ON public.referral_links FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_referral_links" ON public.referral_links;
CREATE POLICY "update_own_referral_links" ON public.referral_links FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_referral_links" ON public.referral_links;
CREATE POLICY "delete_own_referral_links" ON public.referral_links FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- ── 7. Add function to add a referral directly (admin/sponsor) ──
CREATE OR REPLACE FUNCTION public.add_referral_direct(
  p_sponsor_id uuid,
  p_full_name text,
  p_email text,
  p_username text,
  p_position text DEFAULT 'left'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_user_id uuid;
  v_referral_code text;
  v_counter int;
BEGIN
  -- Generate unique referral code
  v_counter := 1;
  LOOP
    v_referral_code := UPPER(LEFT(p_username, 4)) || LPAD(v_counter::text, 3, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_referral_code);
    v_counter := v_counter + 1;
  END LOOP;

  -- Create auth user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    LOWER(p_email),
    crypt('Temp123456!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', p_full_name, 'username', p_username, 'plan', 'inicio', 'referral_code', ''),
    now(),
    now(),
    ''
  ) RETURNING id INTO v_new_user_id;

  -- The handle_new_user trigger will create the profile, but we need to set sponsor + position
  -- Wait for trigger to finish, then update
  UPDATE public.profiles 
  SET sponsor_id = p_sponsor_id, 
      binary_position = p_position,
      status = 'pending',
      force_password_change = true
  WHERE id = v_new_user_id;

  -- Create notification for sponsor
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (p_sponsor_id, 'Nuevo afiliado en tu red', p_full_name || ' se ha unido a tu red como ' || p_position, 'success');

  RETURN v_new_user_id;
END;
$$;

-- ── 8. Add updated_at triggers for new tables ──
DROP TRIGGER IF EXISTS plan_orders_updated_at ON public.plan_orders;
CREATE TRIGGER plan_orders_updated_at
  BEFORE UPDATE ON public.plan_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
