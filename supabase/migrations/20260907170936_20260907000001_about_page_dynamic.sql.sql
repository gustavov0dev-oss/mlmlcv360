/*
# Make the "Nosotros" (About) page fully dynamic

## What this migration does

The About page currently has all its content hardcoded (founders, timeline,
infrastructure cards, mission/vision/values, hero text). This migration creates
dedicated tables so an admin can manage every piece of content from the
dashboard, including uploading founder photos via the existing `logos` storage
bucket (same pattern as testimonials).

## New Tables

1. `about_founders` — Founder cards with name, role, bio, image_url, sort_order, is_active
2. `about_timeline` — Timeline milestones with year, title, description, icon (lucide name), sort_order, is_active
3. `about_infrastructure` — Infrastructure feature cards with title, description, icon, sort_order, is_active
4. `about_values` — Mission/Vision/Values cards with label, text, icon, sort_order, is_active

## system_config keys

Adds these keys to `system_config` for the hero section text:
- `about_hero_badge` — Small badge text above the hero title
- `about_hero_title` — Hero heading (supports a highlighted segment)
- `about_hero_subtitle` — Hero subtitle paragraph
- `about_hero_description` — Hero description paragraph

## Security

- RLS enabled on all four new tables.
- SELECT is public (anon + authenticated) so the public landing page can read.
- INSERT / UPDATE / DELETE restricted to authenticated admin/super_admin roles.
- Uses a SECURITY DEFINER helper `is_admin_user()` to check role safely.
*/

-- ── Helper function: check if current user is admin ──────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

-- ── Table: about_founders ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.about_founders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.about_founders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "about_founders_public_select" ON public.about_founders;
CREATE POLICY "about_founders_public_select"
  ON public.about_founders FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "about_founders_admin_insert" ON public.about_founders;
CREATE POLICY "about_founders_admin_insert"
  ON public.about_founders FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "about_founders_admin_update" ON public.about_founders;
CREATE POLICY "about_founders_admin_update"
  ON public.about_founders FOR UPDATE
  TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "about_founders_admin_delete" ON public.about_founders;
CREATE POLICY "about_founders_admin_delete"
  ON public.about_founders FOR DELETE
  TO authenticated USING (public.is_admin_user());

-- ── Table: about_timeline ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.about_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'Rocket',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.about_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "about_timeline_public_select" ON public.about_timeline;
CREATE POLICY "about_timeline_public_select"
  ON public.about_timeline FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "about_timeline_admin_insert" ON public.about_timeline;
CREATE POLICY "about_timeline_admin_insert"
  ON public.about_timeline FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "about_timeline_admin_update" ON public.about_timeline;
CREATE POLICY "about_timeline_admin_update"
  ON public.about_timeline FOR UPDATE
  TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "about_timeline_admin_delete" ON public.about_timeline;
CREATE POLICY "about_timeline_admin_delete"
  ON public.about_timeline FOR DELETE
  TO authenticated USING (public.is_admin_user());

-- ── Table: about_infrastructure ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.about_infrastructure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'Cloud',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.about_infrastructure ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "about_infrastructure_public_select" ON public.about_infrastructure;
CREATE POLICY "about_infrastructure_public_select"
  ON public.about_infrastructure FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "about_infrastructure_admin_insert" ON public.about_infrastructure;
CREATE POLICY "about_infrastructure_admin_insert"
  ON public.about_infrastructure FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "about_infrastructure_admin_update" ON public.about_infrastructure;
CREATE POLICY "about_infrastructure_admin_update"
  ON public.about_infrastructure FOR UPDATE
  TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "about_infrastructure_admin_delete" ON public.about_infrastructure;
CREATE POLICY "about_infrastructure_admin_delete"
  ON public.about_infrastructure FOR DELETE
  TO authenticated USING (public.is_admin_user());

-- ── Table: about_values ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.about_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT '',
  text text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'Target',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.about_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "about_values_public_select" ON public.about_values;
CREATE POLICY "about_values_public_select"
  ON public.about_values FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "about_values_admin_insert" ON public.about_values;
CREATE POLICY "about_values_admin_insert"
  ON public.about_values FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "about_values_admin_update" ON public.about_values;
CREATE POLICY "about_values_admin_update"
  ON public.about_values FOR UPDATE
  TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "about_values_admin_delete" ON public.about_values;
CREATE POLICY "about_values_admin_delete"
  ON public.about_values FOR DELETE
  TO authenticated USING (public.is_admin_user());

-- ── Seed default system_config keys for hero text ─────────────────────────────
INSERT INTO public.system_config (key, value, category, description) VALUES
  ('about_hero_badge', 'Desde Lima para Latinoamerica', 'general', 'Badge text above hero title on About page'),
  ('about_hero_title', 'Empoderamos a emprendedores latinos', 'general', 'Hero heading on About page'),
  ('about_hero_subtitle', 'Construimos tecnologia que genera libertad financiera real. Nuestra plataforma automatiza lo dificil para que te enfoques en lo importante: tu red.', 'general', 'Hero subtitle on About page'),
  ('about_hero_description', 'MLM 360 es una empresa orientada al desarrollo tecnologico, financiero y comercial, creada para construir un ecosistema digital que impulse la prosperidad de sus socios y embajadores.', 'general', 'Hero description paragraph on About page')
ON CONFLICT (key) DO NOTHING;

-- ── Seed default founders ─────────────────────────────────────────────────────
INSERT INTO public.about_founders (name, role, bio, image_url, sort_order, is_active) VALUES
  ('Jhonatan Arias', 'CEO Fundador', 'Especialista en innovacion y tecnologia digital, enfocado en la creacion de soluciones modernas que integren negocios, emprendimiento y transformacion digital.', 'https://cluv360.com/wp-content/uploads/2026/05/JA2-980x1472.png', 0, true),
  ('Yesenia Cure', 'CEO & Cofundadora', 'Lider enfocada en el crecimiento organizacional y el desarrollo estrategico de la compania, impulsando oportunidades que generen bienestar y prosperidad.', 'https://cluv360.com/wp-content/uploads/2026/05/YC-980x1472.png', 1, true),
  ('Cirilo Jara', 'CEO & Cofundador', 'Ejecutivo orientado al liderazgo comercial y la expansion empresarial, con foco en crecimiento sostenible y fortalecimiento de la red de negocios.', 'https://cluv360.com/wp-content/uploads/2026/05/CJ-980x1472.png', 2, true)
ON CONFLICT DO NOTHING;

-- ── Seed default timeline ─────────────────────────────────────────────────────
INSERT INTO public.about_timeline (year, title, description, icon, sort_order, is_active) VALUES
  ('2020', 'Fundacion', 'Lima, Peru. Un equipo de 3 personas con una vision: democratizar el MLM.', 'Rocket', 0, true),
  ('2021', 'Validacion', '+1,000 afiliados. Primeros pagos de comisiones automatizadas.', 'TrendingUp', 1, true),
  ('2022', 'Expansion regional', 'Presencia en Colombia, Ecuador y Bolivia. +5,000 afiliados.', 'Globe', 2, true),
  ('2023', 'Tienda MLM', 'Marketplace propio con +200 productos y comisiones integradas.', 'Building2', 3, true),
  ('2024', 'Liderazgo', '+12,000 afiliados. S/2.8M en comisiones pagadas. 8 paises.', 'Award', 4, true)
ON CONFLICT DO NOTHING;

-- ── Seed default infrastructure ───────────────────────────────────────────────
INSERT INTO public.about_infrastructure (title, description, icon, sort_order, is_active) VALUES
  ('Cloud nativo', 'Infraestructura serverless en Supabase Edge Functions con auto-scaling.', 'Cloud', 0, true),
  ('Seguridad bancaria', 'Cifrado AES-256, RLS por usuario y auditoria de transacciones.', 'Shield', 1, true),
  ('PostgreSQL + RLS', 'Base de datos transaccional con Row Level Security en cada tabla.', 'Database', 2, true),
  ('Calculo en tiempo real', 'Motor de comisiones binario + unilevel con triggers PostgreSQL.', 'Cpu', 3, true),
  ('Cumplimiento legal', 'INDECOPI, facturacion electronica y retenciones automaticas.', 'Lock', 4, true),
  ('99.9% uptime', 'Monitoreo proactivo, failover automatico y backups cada hora.', 'Zap', 5, true)
ON CONFLICT DO NOTHING;

-- ── Seed default values ───────────────────────────────────────────────────────
INSERT INTO public.about_values (label, text, icon, sort_order, is_active) VALUES
  ('Mision', 'Democratizar las oportunidades de negocio en Latinoamerica mediante tecnologia MLM de vanguardia que empodera a cualquier persona.', 'Target', 0, true),
  ('Vision', 'Ser la plataforma MLM empresarial lider en Latinoamerica para 2028, con presencia en 20 paises y 50,000 afiliados activos.', 'Award', 1, true),
  ('Valores', 'Transparencia radical. Integridad sin compromisos. Innovacion constante. Exito compartido con cada afiliado.', 'HeartHandshake', 2, true)
ON CONFLICT DO NOTHING;
