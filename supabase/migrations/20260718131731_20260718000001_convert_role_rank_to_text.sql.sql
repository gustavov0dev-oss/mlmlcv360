-- Convert profiles.role and profiles.rank from enum to TEXT
-- to allow custom roles/ranks created by admin (e.g. "caporal", "rubi")

-- 1. Drop all policies referencing user_role/mlm_rank enums (public + storage)
DROP POLICY IF EXISTS "admin_all_plans" ON public.plans;
DROP POLICY IF EXISTS "admin_all_ranks" ON public.ranks;
DROP POLICY IF EXISTS "admin_all_subs" ON public.subscriptions;
DROP POLICY IF EXISTS "admin_all_transactions" ON public.transactions;
DROP POLICY IF EXISTS "delete_mlm_tree" ON public.mlm_tree;
DROP POLICY IF EXISTS "insert_commissions" ON public.commissions;
DROP POLICY IF EXISTS "insert_mlm_tree" ON public.mlm_tree;
DROP POLICY IF EXISTS "insert_notifications" ON public.notifications;
DROP POLICY IF EXISTS "update_mlm_tree" ON public.mlm_tree;
DROP POLICY IF EXISTS "admin_all_categories" ON public.product_categories;
DROP POLICY IF EXISTS "admin_all_products" ON public.products;
DROP POLICY IF EXISTS "admin_all_variants" ON public.product_variants;
DROP POLICY IF EXISTS "admin_all_carts" ON public.carts;
DROP POLICY IF EXISTS "admin_zones" ON public.shipping_zones;
DROP POLICY IF EXISTS "admin_methods" ON public.shipping_methods;
DROP POLICY IF EXISTS "admin_comm_cfg" ON public.mlm_commissions_config;
DROP POLICY IF EXISTS "admin_prod_comm" ON public.product_commissions;
DROP POLICY IF EXISTS "admin_all_coupons" ON public.coupons;
DROP POLICY IF EXISTS "user_orders_s" ON public.orders;
DROP POLICY IF EXISTS "order_items_s" ON public.order_items;
DROP POLICY IF EXISTS "admin_order_items_all" ON public.order_items;
DROP POLICY IF EXISTS "tracking_s" ON public.order_tracking;
DROP POLICY IF EXISTS "admin_tracking_i" ON public.order_tracking;
DROP POLICY IF EXISTS "admin_insert_custom_roles" ON public.custom_roles;
DROP POLICY IF EXISTS "admin_update_custom_roles" ON public.custom_roles;
DROP POLICY IF EXISTS "admin_delete_custom_roles" ON public.custom_roles;
DROP POLICY IF EXISTS "admin_insert_role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "admin_delete_role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "social_links_insert" ON public.social_links;
DROP POLICY IF EXISTS "social_links_update" ON public.social_links;
DROP POLICY IF EXISTS "social_links_delete" ON public.social_links;
DROP POLICY IF EXISTS "faq_insert" ON public.faq_items;
DROP POLICY IF EXISTS "faq_update" ON public.faq_items;
DROP POLICY IF EXISTS "faq_delete" ON public.faq_items;
DROP POLICY IF EXISTS "complaint_select_admin" ON public.complaint_book;
DROP POLICY IF EXISTS "complaint_update_admin" ON public.complaint_book;
DROP POLICY IF EXISTS "complaint_delete_admin" ON public.complaint_book;
DROP POLICY IF EXISTS "faq_items_admin_insert" ON public.faq_items;
DROP POLICY IF EXISTS "faq_items_admin_update" ON public.faq_items;
DROP POLICY IF EXISTS "faq_items_admin_delete" ON public.faq_items;
DROP POLICY IF EXISTS "social_links_admin_insert" ON public.social_links;
DROP POLICY IF EXISTS "social_links_admin_update" ON public.social_links;
DROP POLICY IF EXISTS "social_links_admin_delete" ON public.social_links;
DROP POLICY IF EXISTS "complaint_book_admin_select" ON public.complaint_book;
DROP POLICY IF EXISTS "complaint_book_admin_update" ON public.complaint_book;
DROP POLICY IF EXISTS "complaint_book_admin_delete" ON public.complaint_book;
DROP POLICY IF EXISTS "admin_read_all_legal_pages" ON public.legal_pages;
DROP POLICY IF EXISTS "admin_insert_legal_pages" ON public.legal_pages;
DROP POLICY IF EXISTS "admin_update_legal_pages" ON public.legal_pages;
DROP POLICY IF EXISTS "admin_delete_legal_pages" ON public.legal_pages;
DROP POLICY IF EXISTS "admin_upload_products" ON storage.objects;
DROP POLICY IF EXISTS "admin_delete_products" ON storage.objects;

-- 2. Drop and recreate functions that cast to these enums
DROP FUNCTION IF EXISTS public.add_referral_direct(uuid, text, text, text, text);

CREATE FUNCTION public.add_referral_direct(
  p_sponsor_id uuid,
  p_email text,
  p_full_name text,
  p_username text DEFAULT NULL,
  p_position text DEFAULT 'left'
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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
    'user', 'active', 'bronze', 'free',
    v_referral_code, p_sponsor_id, p_position,
    NULL, v_slug, v_referral_code, true, true, now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    sponsor_id = p_sponsor_id,
    binary_position = p_position,
    referral_code = v_referral_code,
    invite_link = v_referral_code,
    updated_at = now();
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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username   text;
  v_full_name  text;
  v_plan       text;
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
  v_plan := v_plan_raw;
  v_avatar := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'picture'), '')
  );
  v_slug := v_username;
  v_counter := 0;
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE slug = v_slug);
    v_counter := v_counter + 1;
    v_slug := v_username || v_counter::text;
  END LOOP;
  v_counter := 1;
  v_ref_code := upper(left(v_username, 4)) || lpad(v_counter::text, 3, '0');
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_ref_code);
    v_counter := v_counter + 1;
    v_ref_code := upper(left(v_username, 4)) || lpad(v_counter::text, 3, '0');
  END LOOP;
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
    'user', 'active', 'bronze', v_plan,
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
    force_password_change = false,
    updated_at  = now();
  IF v_plan = 'free' THEN
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

-- 3. Alter columns from enum to TEXT
ALTER TABLE profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE profiles ALTER COLUMN rank DROP DEFAULT;
ALTER TABLE profiles ALTER COLUMN role TYPE TEXT;
ALTER TABLE profiles ALTER COLUMN rank TYPE TEXT;
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'user';
ALTER TABLE profiles ALTER COLUMN rank SET DEFAULT '';

-- 4. Recreate policies with TEXT comparisons (no enum casts)
CREATE POLICY "admin_all_plans" ON public.plans FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "admin_all_ranks" ON public.ranks FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "admin_all_subs" ON public.subscriptions FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "admin_all_transactions" ON public.transactions FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "delete_mlm_tree" ON public.mlm_tree FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "insert_commissions" ON public.commissions FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "insert_mlm_tree" ON public.mlm_tree FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) OR (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin'])))))));
CREATE POLICY "insert_notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin', 'support']))))));
CREATE POLICY "update_mlm_tree" ON public.mlm_tree FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "admin_all_categories" ON public.product_categories FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "admin_all_products" ON public.products FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "admin_all_variants" ON public.product_variants FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "admin_all_carts" ON public.carts FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "admin_zones" ON public.shipping_zones FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "admin_methods" ON public.shipping_methods FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "admin_comm_cfg" ON public.mlm_commissions_config FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "admin_prod_comm" ON public.product_commissions FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "admin_all_coupons" ON public.coupons FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "user_orders_s" ON public.orders FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin', 'support', 'inspector'])))))));
CREATE POLICY "order_items_s" ON public.order_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM orders o WHERE ((o.id = order_items.order_id) AND ((o.user_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin', 'admin', 'support', 'inspector']))))))))));
CREATE POLICY "admin_order_items_all" ON public.order_items FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "tracking_s" ON public.order_tracking FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM orders o WHERE ((o.id = order_tracking.order_id) AND ((o.user_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin', 'admin', 'support']))))))))));
CREATE POLICY "admin_tracking_i" ON public.order_tracking FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin', 'support']))))));
CREATE POLICY "admin_insert_custom_roles" ON public.custom_roles FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin', 'super_admin']))))));
CREATE POLICY "admin_update_custom_roles" ON public.custom_roles FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin', 'super_admin'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin', 'super_admin']))))));
CREATE POLICY "admin_delete_custom_roles" ON public.custom_roles FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin', 'super_admin']))))));
CREATE POLICY "admin_insert_role_permissions" ON public.role_permissions FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin', 'super_admin']))))));
CREATE POLICY "admin_delete_role_permissions" ON public.role_permissions FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin', 'super_admin']))))));
CREATE POLICY "social_links_insert" ON public.social_links FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "social_links_update" ON public.social_links FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "social_links_delete" ON public.social_links FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "faq_insert" ON public.faq_items FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "faq_update" ON public.faq_items FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "faq_delete" ON public.faq_items FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "complaint_select_admin" ON public.complaint_book FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin', 'inspector']))))));
CREATE POLICY "complaint_update_admin" ON public.complaint_book FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "complaint_delete_admin" ON public.complaint_book FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "faq_items_admin_insert" ON public.faq_items FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "faq_items_admin_update" ON public.faq_items FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "faq_items_admin_delete" ON public.faq_items FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "social_links_admin_insert" ON public.social_links FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "social_links_admin_update" ON public.social_links FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "social_links_admin_delete" ON public.social_links FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "complaint_book_admin_select" ON public.complaint_book FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "complaint_book_admin_update" ON public.complaint_book FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "complaint_book_admin_delete" ON public.complaint_book FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "admin_read_all_legal_pages" ON public.legal_pages FOR SELECT TO authenticated USING (((is_published = true) OR (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin'])))))));
CREATE POLICY "admin_insert_legal_pages" ON public.legal_pages FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "admin_update_legal_pages" ON public.legal_pages FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "admin_delete_legal_pages" ON public.legal_pages FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "admin_upload_products" ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'products'::text) AND (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
CREATE POLICY "admin_delete_products" ON storage.objects FOR DELETE TO authenticated USING ((bucket_id = 'products'::text) AND (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin', 'admin']))))));
