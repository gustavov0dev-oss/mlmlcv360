/*
# Create testimonials table

1. New Tables
   - `testimonials`
     - `id` (uuid, primary key)
     - `name` (text, not null) — full name of the person
     - `role` (text) — job title / city, e.g. "Emprendedora, Lima"
     - `avatar_url` (text) — URL to profile photo (external URL or Supabase storage URL)
     - `content` (text, not null) — the testimonial quote
     - `earnings` (text) — displayed earnings, e.g. "S/ 4,800/mes"
     - `rating` (int, default 5) — star rating 1-5
     - `is_active` (boolean, default true) — controls visibility on landing page
     - `sort_order` (int, default 0) — display order
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

2. Security
   - RLS enabled.
   - Public can SELECT active testimonials (anon + authenticated).
   - Only authenticated users can INSERT/UPDATE/DELETE (admins manage via dashboard).

3. Notes
   - Landing page queries: filter is_active = true, order by sort_order ASC.
   - Admin dashboard can see all rows regardless of is_active.
   - Avatar can be: external URL (https://...) or Supabase storage path.
*/

CREATE TABLE IF NOT EXISTS testimonials (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  role        text NOT NULL DEFAULT '',
  avatar_url  text NOT NULL DEFAULT '',
  content     text NOT NULL,
  earnings    text NOT NULL DEFAULT '',
  rating      int  NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Public read: anyone can read active testimonials (landing page)
DROP POLICY IF EXISTS "public_read_active_testimonials" ON testimonials;
CREATE POLICY "public_read_active_testimonials" ON testimonials FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Authenticated read all: admins can see inactive ones too
DROP POLICY IF EXISTS "auth_read_all_testimonials" ON testimonials;
CREATE POLICY "auth_read_all_testimonials" ON testimonials FOR SELECT
  TO authenticated
  USING (true);

-- Admin write: only authenticated users can manage testimonials
DROP POLICY IF EXISTS "auth_insert_testimonials" ON testimonials;
CREATE POLICY "auth_insert_testimonials" ON testimonials FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_testimonials" ON testimonials;
CREATE POLICY "auth_update_testimonials" ON testimonials FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_testimonials" ON testimonials;
CREATE POLICY "auth_delete_testimonials" ON testimonials FOR DELETE
  TO authenticated
  USING (true);

-- Seed with demo testimonials
INSERT INTO testimonials (name, role, avatar_url, content, earnings, rating, is_active, sort_order)
VALUES
  ('Roberto Mendoza',   'Emprendedor, Lima',              'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200',   'MLM 360 transformó mi negocio. En solo 8 meses alcancé el rango Diamante y mis ingresos se multiplicaron por 5. El sistema es intuitivo y el soporte es excepcional.', 'S/ 12,500/mes', 5, true, 1),
  ('Patricia Vega',     'Ama de casa, Arequipa',          'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200',    'Empecé sin experiencia en negocios y hoy tengo una red de más de 200 afiliados. La plataforma hace todo el trabajo de seguimiento automáticamente.',               'S/ 4,800/mes',  5, true, 2),
  ('Miguel Torres',     'Vendedor, Cusco',                'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=200',   'La mejor decisión que tomé fue unirme a MLM 360. El árbol genealógico en tiempo real me permite gestionar mi red desde cualquier lugar.',                         'S/ 8,200/mes',  5, true, 3),
  ('Sandra Palomino',   'Emprendedora, Trujillo',         'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200',   'La automatización de comisiones me ahorró horas de trabajo manual. Ahora me enfoco en expandir mi red.',                                                          'S/ 6,100/mes',  5, true, 4),
  ('Diego Ramirez',     'Profesional independiente, Piura','https://images.pexels.com/photos/1680172/pexels-photo-1680172.jpeg?auto=compress&cs=tinysrgb&w=200',  'Escalé de Bronce a Platino en 4 meses. El panel de reportes me ayuda a identificar qué parte de mi red necesita atención.',                                       'S/ 5,500/mes',  5, true, 5),
  ('Luciana Flores',    'Comerciante, Ica',               'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200',     'El soporte 24/7 es increíble. Tuve una duda un domingo y en 15 minutos tenía la respuesta. Eso genera mucha confianza.',                                         'S/ 3,800/mes',  5, true, 6)
ON CONFLICT DO NOTHING;
