-- Migration 4: Shipping & MLM Commission Config (run before orders)
CREATE TABLE IF NOT EXISTS shipping_zones (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  countries  jsonb NOT NULL DEFAULT '[]',
  regions    jsonb NOT NULL DEFAULT '[]',
  status     text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipping_methods (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id            uuid NOT NULL REFERENCES shipping_zones(id) ON DELETE CASCADE,
  name               text NOT NULL,
  description        text,
  type               text NOT NULL CHECK (type IN ('flat','weight','free_threshold')),
  price              numeric(12,2) NOT NULL DEFAULT 0,
  min_weight         numeric(8,3),
  max_weight         numeric(8,3),
  free_threshold     numeric(12,2),
  estimated_days_min int,
  estimated_days_max int,
  status             text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at         timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shipping_methods_zone ON shipping_methods(zone_id);

CREATE TABLE IF NOT EXISTS mlm_commissions_config (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rank                text NOT NULL CHECK (rank IN ('bronze','silver','gold','platinum','diamond','crown')),
  level               int NOT NULL CHECK (level BETWEEN 1 AND 10),
  type                text NOT NULL CHECK (type IN ('percentage','fixed')),
  value               numeric(12,4) NOT NULL,
  min_purchase_amount numeric(12,2) DEFAULT 0,
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at          timestamptz DEFAULT now(),
  UNIQUE (rank, level)
);

CREATE TABLE IF NOT EXISTS product_commissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rank_override text CHECK (rank_override IN ('bronze','silver','gold','platinum','diamond','crown')),
  level         int NOT NULL CHECK (level BETWEEN 1 AND 10),
  type          text NOT NULL CHECK (type IN ('percentage','fixed')),
  value         numeric(12,4) NOT NULL,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_commissions_product ON product_commissions(product_id);

ALTER TABLE shipping_zones        ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_methods      ENABLE ROW LEVEL SECURITY;
ALTER TABLE mlm_commissions_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_commissions   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pub_read_zones"    ON shipping_zones FOR SELECT TO anon, authenticated USING (status='active');
CREATE POLICY "admin_zones"       ON shipping_zones FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('super_admin','admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('super_admin','admin')));

CREATE POLICY "pub_read_methods"  ON shipping_methods FOR SELECT TO anon, authenticated USING (status='active');
CREATE POLICY "admin_methods"     ON shipping_methods FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('super_admin','admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('super_admin','admin')));

CREATE POLICY "pub_read_comm_cfg" ON mlm_commissions_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_comm_cfg"    ON mlm_commissions_config FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('super_admin','admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('super_admin','admin')));

CREATE POLICY "pub_read_prod_comm" ON product_commissions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_prod_comm"    ON product_commissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('super_admin','admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('super_admin','admin')));

-- Seed default commission rates
INSERT INTO mlm_commissions_config (rank, level, type, value) VALUES
  ('bronze',1,'percentage',5),('bronze',2,'percentage',2),('bronze',3,'percentage',1),
  ('silver',1,'percentage',7),('silver',2,'percentage',3),('silver',3,'percentage',2),('silver',4,'percentage',1),
  ('gold',1,'percentage',8),('gold',2,'percentage',4),('gold',3,'percentage',2.5),('gold',4,'percentage',1.5),('gold',5,'percentage',1),
  ('platinum',1,'percentage',10),('platinum',2,'percentage',5),('platinum',3,'percentage',3),('platinum',4,'percentage',2),('platinum',5,'percentage',1.5),('platinum',6,'percentage',1),
  ('diamond',1,'percentage',12),('diamond',2,'percentage',6),('diamond',3,'percentage',4),('diamond',4,'percentage',2.5),('diamond',5,'percentage',2),('diamond',6,'percentage',1.5),('diamond',7,'percentage',1),('diamond',8,'percentage',0.5),
  ('crown',1,'percentage',15),('crown',2,'percentage',7),('crown',3,'percentage',5),('crown',4,'percentage',3),('crown',5,'percentage',2.5),('crown',6,'percentage',2),('crown',7,'percentage',1.5),('crown',8,'percentage',1),('crown',9,'percentage',0.75),('crown',10,'percentage',0.5)
ON CONFLICT (rank,level) DO NOTHING;

-- Seed shipping zones and methods
INSERT INTO shipping_zones (name, countries, regions) VALUES
  ('Lima Metropolitana', '["PE"]', '["Lima"]'),
  ('Resto del Perú', '["PE"]', '[]'),
  ('Internacional', '["US","CL","CO","MX","AR","ES"]', '[]')
ON CONFLICT DO NOTHING;

WITH z AS (SELECT id FROM shipping_zones WHERE name='Lima Metropolitana' LIMIT 1)
INSERT INTO shipping_methods (zone_id, name, type, price, free_threshold, estimated_days_min, estimated_days_max)
SELECT z.id,'Delivery Express','flat',15,150,1,2 FROM z
ON CONFLICT DO NOTHING;
WITH z AS (SELECT id FROM shipping_zones WHERE name='Lima Metropolitana' LIMIT 1)
INSERT INTO shipping_methods (zone_id, name, type, price, free_threshold, estimated_days_min, estimated_days_max)
SELECT z.id,'Delivery Estándar','free_threshold',0,150,2,4 FROM z
ON CONFLICT DO NOTHING;
WITH z AS (SELECT id FROM shipping_zones WHERE name='Resto del Perú' LIMIT 1)
INSERT INTO shipping_methods (zone_id, name, type, price, estimated_days_min, estimated_days_max)
SELECT z.id,'Envío Nacional','flat',20,4,7 FROM z
ON CONFLICT DO NOTHING;

INSERT INTO system_config (key, value, description, category) VALUES
  ('free_shipping_threshold','150','Monto mínimo para envío gratis (PEN)','store'),
  ('igv_rate','0.18','Tasa de IGV para facturas','store'),
  ('store_enabled','true','Tienda activa','store'),
  ('store_name','MLM360 Tienda','Nombre de la tienda','store'),
  ('company_ruc','20000000001','RUC de la empresa','company'),
  ('invoice_series','B001','Serie de boletas','store')
ON CONFLICT (key) DO NOTHING;
