/*
# Dynamic Plans, Ranks, and Trigger Fix

## Summary
Creates dynamic plans and ranks tables managed by admin, fixes the handle_new_user trigger,
adds referral code auto-generation, and seeds default data.

## New Tables
1. `plans` - Dynamic subscription plans manageable from admin panel
2. `ranks` - Dynamic MLM ranks manageable from admin panel

## Modified
- `handle_new_user()` trigger function - simplified, auto-generates username from email
- `add_referral_direct()` - fixed to create proper auth user with identity
- `system_config` - seeds default currency config
*/

-- Drop existing function that has incompatible return type
DROP FUNCTION IF EXISTS public.add_referral_direct(uuid, text, text, text, text);

-- ── PLANS TABLE ──
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PEN',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  badge text,
  is_popular boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  trial_days int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_plans" ON plans;
CREATE POLICY "public_read_plans" ON plans FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "admin_all_plans" ON plans;
CREATE POLICY "admin_all_plans" ON plans FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

-- ── RANKS TABLE ──
CREATE TABLE IF NOT EXISTS ranks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT '🏆',
  color text DEFAULT 'text-amber-600',
  bg_color text DEFAULT 'bg-amber-500/10',
  border_color text DEFAULT 'border-amber-500/30',
  bonus numeric(10,2) NOT NULL DEFAULT 0,
  min_affiliates int NOT NULL DEFAULT 0,
  min_volume numeric(12,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ranks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_ranks" ON ranks;
CREATE POLICY "public_read_ranks" ON ranks FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "admin_all_ranks" ON ranks;
CREATE POLICY "admin_all_ranks" ON ranks FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

-- ── SEED DEFAULT PLANS ──
INSERT INTO plans (name, slug, description, price, currency, features, badge, is_popular, is_active, sort_order, trial_days) VALUES
('Inicio', 'inicio', 'Perfecto para comenzar tu viaje en MLM 360', 99, 'PEN',
 '["Acceso básico al sistema","Red de hasta 50 afiliados","Comisiones directas 5%","Panel de reportes básico","Soporte por correo","App móvil PWA"]'::jsonb,
 NULL, false, true, 1, 0),
('Pro', 'pro', 'Para profesionales que buscan crecer rápidamente', 299, 'PEN',
 '["Todo lo del plan Inicio","Red ilimitada de afiliados","Comisiones directas 8%","Comisiones binarias 4%","Bonos por rango hasta Platino","Panel de reportes avanzado","Soporte prioritario 24/7","Árbol genealógico interactivo"]'::jsonb,
 'Más Popular', true, true, 2, 0),
('Elite', 'elite', 'El máximo nivel para líderes de alto impacto', 799, 'PEN',
 '["Todo lo del plan Pro","Comisiones directas 12%","Comisiones binarias 7%","Todos los bonos y rangos","Bono de liderazgo elite","Acceso a eventos exclusivos","Gerente de cuenta dedicado","API de integración","Reportes personalizados"]'::jsonb,
 'Premium', false, true, 3, 0),
('Free Trial', 'free', 'Prueba gratis por 14 días sin tarjeta de crédito', 0, 'PEN',
 '["Acceso completo por 14 días","Sin tarjeta de crédito","Todas las funciones incluidas","Soporte por correo","App móvil PWA"]'::jsonb,
 'Gratis', false, true, 0, 14)
ON CONFLICT (slug) DO NOTHING;

-- ── SEED DEFAULT RANKS ──
INSERT INTO ranks (name, slug, description, icon, color, bg_color, border_color, bonus, min_affiliates, min_volume, sort_order, is_active) VALUES
('Bronce', 'bronze', 'Rango inicial para nuevos afiliados', '🥉', 'text-amber-600', 'bg-amber-500/10', 'border-amber-500/30', 150, 5, 5000, 1, true),
('Plata', 'silver', 'Segundo nivel de reconocimiento', '🥈', 'text-slate-400', 'bg-slate-400/10', 'border-slate-400/30', 350, 15, 15000, 2, true),
('Oro', 'gold', 'Tercer nivel, líderes en crecimiento', '🥇', 'text-yellow-500', 'bg-yellow-500/10', 'border-yellow-500/30', 750, 30, 50000, 3, true),
('Platino', 'platinum', 'Cuarto nivel, élite del sistema', '💿', 'text-slate-300', 'bg-slate-300/10', 'border-slate-300/30', 2000, 75, 150000, 4, true),
('Diamante', 'diamond', 'Quinto nivel, líderes destacados', '💎', 'text-cyan-400', 'bg-cyan-400/10', 'border-cyan-400/30', 5000, 150, 500000, 5, true),
('Corona', 'crown', 'Rango máximo, leyendas del MLM', '👑', 'text-yellow-400', 'bg-yellow-400/10', 'border-yellow-400/30', 15000, 300, 1500000, 6, true)
ON CONFLICT (slug) DO NOTHING;

-- ── SEED DEFAULT CURRENCY CONFIG ──
INSERT INTO system_config (key, value, category) VALUES
('default_currency', 'PEN', 'currency'),
('exchange_rate_usd', '3.72', 'currency'),
('currency_symbol', 'S/', 'currency')
ON CONFLICT (key) DO NOTHING;

-- ── FIX handle_new_user TRIGGER ──
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
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_plan := COALESCE(NEW.raw_user_meta_data->>'plan', 'inicio');
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';

  v_counter := 1;
  LOOP
    v_generated_code := UPPER(LEFT(v_username, 4)) || LPAD(v_counter::text, 3, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_generated_code);
    v_counter := v_counter + 1;
  END LOOP;

  IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
    SELECT id INTO v_sponsor_id FROM public.profiles WHERE UPPER(referral_code) = UPPER(v_referral_code) LIMIT 1;
  END IF;

  INSERT INTO public.profiles (
    id, email, username, full_name, plan, referral_code, sponsor_id,
    status, role, rank, email_confirmed, force_password_change
  ) VALUES (
    NEW.id, NEW.email, v_username,
    CASE WHEN v_full_name = '' THEN v_username ELSE v_full_name END,
    v_plan, v_generated_code, v_sponsor_id,
    'active', 'user', 'bronze',
    NEW.email_confirmed_at IS NOT NULL, false
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (NEW.id, '¡Bienvenido a MLM 360!', 'Tu cuenta ha sido creada exitosamente. Comienza a construir tu red ahora mismo.', 'success')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── Add referral_direct RPC ──
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
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_referral_code text;
  v_counter int;
BEGIN
  v_counter := 1;
  LOOP
    v_referral_code := UPPER(LEFT(p_username, 4)) || LPAD(v_counter::text, 3, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_referral_code);
    v_counter := v_counter + 1;
  END LOOP;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at, email_change_confirm_status,
    raw_user_meta_data, raw_app_meta_data,
    created_at, updated_at, is_sso_user, is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', uuid_generate_v4(),
    'authenticated', 'authenticated', p_email,
    crypt('Temp123456!', gen_salt('bf')), now(), 0,
    jsonb_build_object('username', p_username, 'full_name', p_full_name, 'plan', 'inicio'),
    '{}', now(), now(), false, false
  )
  RETURNING id INTO v_user_id;

  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id)
  VALUES (
    v_user_id::text, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email, 'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now(), uuid_generate_v4()
  );

  UPDATE public.profiles SET
    sponsor_id = p_sponsor_id,
    binary_position = p_position,
    force_password_change = true
  WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'user_id', v_user_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
