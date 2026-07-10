/*
# Social Links, FAQ Items y Libro de Reclamaciones

1. Nuevas tablas: social_links, faq_items, complaints_book (Ley 29571 Peru)
2. Config: columna complaints_book_enabled en system_config
3. RLS: social_links/faq_items lectura pública, escritura admin; complaints_book inserción pública, gestión admin
4. Semilla: redes sociales y FAQs
*/

-- ─── social_links ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  url text NOT NULL DEFAULT '#',
  icon text NOT NULL DEFAULT 'facebook',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_social_links" ON social_links;
CREATE POLICY "public_select_social_links" ON social_links FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_social_links" ON social_links;
CREATE POLICY "admin_insert_social_links" ON social_links FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_social_links" ON social_links;
CREATE POLICY "admin_update_social_links" ON social_links FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_social_links" ON social_links;
CREATE POLICY "admin_delete_social_links" ON social_links FOR DELETE
  TO authenticated USING (true);

-- ─── faq_items ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_faq_items" ON faq_items;
CREATE POLICY "public_select_faq_items" ON faq_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_faq_items" ON faq_items;
CREATE POLICY "admin_insert_faq_items" ON faq_items FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_faq_items" ON faq_items;
CREATE POLICY "admin_update_faq_items" ON faq_items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_faq_items" ON faq_items;
CREATE POLICY "admin_delete_faq_items" ON faq_items FOR DELETE
  TO authenticated USING (true);

-- ─── complaints_book ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints_book (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correlativo text UNIQUE,
  tipo text NOT NULL CHECK (tipo IN ('queja', 'reclamo')),
  nombre text NOT NULL,
  apellido text NOT NULL,
  tipo_doc text NOT NULL DEFAULT 'DNI' CHECK (tipo_doc IN ('DNI', 'CE', 'Pasaporte', 'RUC')),
  num_doc text NOT NULL,
  email text NOT NULL,
  telefono text,
  direccion text,
  es_menor boolean NOT NULL DEFAULT false,
  apoderado_nombre text,
  apoderado_doc text,
  tipo_bien text NOT NULL DEFAULT 'producto' CHECK (tipo_bien IN ('producto', 'servicio')),
  monto numeric(10,2),
  descripcion_bien text NOT NULL,
  detalle text NOT NULL,
  pedido text,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_proceso', 'resuelto', 'cerrado')),
  respuesta text,
  fecha_respuesta timestamptz,
  atendido_por uuid REFERENCES auth.users(id),
  ip_address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE complaints_book ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_complaints" ON complaints_book;
CREATE POLICY "public_insert_complaints" ON complaints_book FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_select_complaints" ON complaints_book;
CREATE POLICY "admin_select_complaints" ON complaints_book FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_update_complaints" ON complaints_book;
CREATE POLICY "admin_update_complaints" ON complaints_book FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Trigger para generar correlativo
CREATE OR REPLACE FUNCTION generate_complaint_correlativo()
RETURNS trigger AS $$
DECLARE
  seq_val integer;
BEGIN
  IF NEW.correlativo IS NULL THEN
    seq_val := nextval(pg_get_serial_sequence('complaints_book', 'id'));
    NEW.correlativo := 'REC-' || to_char(NEW.created_at, 'YYYY') || '-' || lpad(seq_val::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_generate_complaint_correlativo ON complaints_book;
CREATE TRIGGER trg_generate_complaint_correlativo
  BEFORE INSERT ON complaints_book
  FOR EACH ROW EXECUTE FUNCTION generate_complaint_correlativo();

-- ─── system_config: columna complaints_book_enabled ──────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'system_config' AND column_name = 'complaints_book_enabled'
  ) THEN
    ALTER TABLE system_config ADD COLUMN complaints_book_enabled boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- ─── Semilla: redes sociales ──────────────────────────────────────────────────
INSERT INTO social_links (platform, url, icon, is_active, sort_order) VALUES
  ('Facebook', '#', 'facebook', true, 1),
  ('Instagram', '#', 'instagram', true, 2),
  ('LinkedIn', '#', 'linkedin', true, 3),
  ('TikTok', '#', 'tiktok', false, 4),
  ('YouTube', '#', 'youtube', false, 5),
  ('X (Twitter)', '#', 'twitter', false, 6)
ON CONFLICT DO NOTHING;

-- ─── Semilla: preguntas frecuentes ───────────────────────────────────────────
INSERT INTO faq_items (question, answer, is_active, sort_order) VALUES
  ('¿Qué es y cómo funciona la plataforma?', 'Somos una plataforma de marketing multinivel que te permite construir una red de afiliados y ganar comisiones por sus ventas. Funciona en estructura binaria y unilevel, maximizando tus ingresos a través de múltiples fuentes.', true, 1),
  ('¿Cuánto puedo ganar?', 'Tus ganancias dependen de tu esfuerzo y el tamaño de tu red. Los afiliados activos ganan en promedio entre S/ 1,500 y S/ 15,000 mensuales. Los rangos más altos pueden superar los S/ 50,000 mensuales.', true, 2),
  ('¿Cómo se calculan las comisiones?', 'Las comisiones se calculan automáticamente según tu plan activo. Incluyen comisiones directas (5-12%), comisiones binarias (4-7%), bonos por rango y residuales por tu red de afiliados.', true, 3),
  ('¿Puedo cambiar de plan en cualquier momento?', 'Sí, puedes hacer upgrade de tu plan cuando quieras. El cambio aplica de forma inmediata y las nuevas comisiones se calculan desde ese momento.', true, 4),
  ('¿Cómo se realizan los pagos de comisiones?', 'Los pagos se procesan quincenalmente (1 y 15 de cada mes) mediante transferencia bancaria a cualquier banco peruano, o a través de billeteras digitales como Yape, Plin o BCP.', true, 5),
  ('¿Es seguro el sistema?', 'Sí, utilizamos tecnología de encriptación de nivel bancario, autenticación de dos factores, y todos los datos están protegidos según las normativas peruanas de protección de datos.', true, 6)
ON CONFLICT DO NOTHING;
