
-- ─── system_config ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  value       TEXT,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'general',
  updated_by  UUID REFERENCES auth.users(id),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_config" ON system_config FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin'))
  );
CREATE POLICY "admins_insert_config" ON system_config FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin'))
  );
CREATE POLICY "admins_update_config" ON system_config FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin'))
  );
CREATE POLICY "admins_delete_config" ON system_config FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin'))
  );

-- Seed system config
INSERT INTO system_config (key, value, description, category) VALUES
  ('company_name',      'MLM 360',                  'Nombre de la empresa',              'general'),
  ('company_email',     'contacto@mlm360.pe',       'Correo corporativo',                'general'),
  ('company_phone',     '+51 1 234 5678',            'Teléfono de contacto',              'general'),
  ('company_address',   'Av. Javier Prado Este 100, San Isidro, Lima, Perú', 'Dirección', 'general'),
  ('default_currency',  'PEN',                      'Moneda por defecto',                'currency'),
  ('exchange_rate_usd', '3.72',                     'Tipo de cambio USD a PEN',          'currency'),
  ('commission_direct', '8',                        '% comisión directa base',           'commissions'),
  ('commission_binary', '4',                        '% comisión binaria base',           'commissions'),
  ('commission_unilevel','2',                       '% comisión unilevel base',          'commissions'),
  ('payment_cycle',     '15',                       'Días entre pagos',                  'payments'),
  ('min_withdrawal',    '50',                       'Monto mínimo de retiro (PEN)',       'payments'),
  ('igv_rate',          '18',                       '% IGV Perú',                        'payments'),
  ('max_levels',        '7',                        'Niveles máximos de red',             'mlm'),
  ('binary_cap',        '2',                        'Posiciones binarias por nodo',       'mlm'),
  ('reg_open',          'true',                     'Registro público habilitado',        'general'),
  ('maintenance_mode',  'false',                    'Modo mantenimiento',                 'general')
ON CONFLICT (key) DO NOTHING;

-- ─── payment_gateways ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_gateways (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  logo         TEXT,
  currency     TEXT NOT NULL,  -- PEN or USD
  is_active    BOOLEAN DEFAULT FALSE,
  credentials  JSONB DEFAULT '{}',
  test_mode    BOOLEAN DEFAULT TRUE,
  description  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_gateways" ON payment_gateways FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin'))
  );
CREATE POLICY "admins_insert_gateways" ON payment_gateways FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin'))
  );
CREATE POLICY "admins_update_gateways" ON payment_gateways FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin'))
  );
CREATE POLICY "admins_delete_gateways" ON payment_gateways FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin'))
  );

INSERT INTO payment_gateways (slug, name, logo, currency, is_active, test_mode, description, credentials) VALUES
  ('paypal',       'PayPal',        '🅿️', 'USD', FALSE, TRUE,
   'Pasarela internacional para pagos en dólares. Acepta tarjetas y saldo PayPal.',
   '{"client_id": "", "client_secret": "", "webhook_id": ""}'),
  ('culqi',        'Culqi',         '💳', 'PEN', FALSE, TRUE,
   'Pasarela peruana. Acepta Visa, Mastercard y Amex en soles.',
   '{"public_key": "", "private_key": "", "rsa_key": ""}'),
  ('niubiz',       'Niubiz',        '🏦', 'PEN', FALSE, TRUE,
   'Red autorizada por Visa Perú. Pagos en soles con tarjeta.',
   '{"merchant_id": "", "access_key": "", "secret_key": ""}'),
  ('mercadopago',  'Mercado Pago',  '🛒', 'PEN', FALSE, TRUE,
   'Acepta tarjeta, Yape, Plin y cuotas sin interés.',
   '{"access_token": "", "public_key": "", "webhook_secret": ""}')
ON CONFLICT (slug) DO NOTHING;
