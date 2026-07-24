-- Add is_sensitive column to system_config for proper access control
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS is_sensitive BOOLEAN DEFAULT FALSE;

-- Mark existing sensitive keys
UPDATE system_config SET is_sensitive = TRUE 
WHERE key IN ('google_client_secret', 'fixer_api_key')
   OR key LIKE '%secret%'
   OR key LIKE '%password%'
   OR key LIKE '%private_key%'
   OR key LIKE '%access_token%'
   OR key LIKE '%api_key%';

-- Mark google_client_id as non-sensitive (public)
UPDATE system_config SET is_sensitive = FALSE WHERE key = 'google_client_id';

-- Insert SMTP configuration keys if they don't exist
INSERT INTO system_config (id, key, value, description, category, is_sensitive)
SELECT gen_random_uuid(), 'smtp_enabled', 'false', 'Habilitar servidor SMTP', 'email', FALSE
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'smtp_enabled');

INSERT INTO system_config (id, key, value, description, category, is_sensitive)
SELECT gen_random_uuid(), 'smtp_host', '', 'Servidor SMTP (ej: smtp.gmail.com)', 'email', FALSE
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'smtp_host');

INSERT INTO system_config (id, key, value, description, category, is_sensitive)
SELECT gen_random_uuid(), 'smtp_port', '587', 'Puerto SMTP', 'email', FALSE
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'smtp_port');

INSERT INTO system_config (id, key, value, description, category, is_sensitive)
SELECT gen_random_uuid(), 'smtp_user', '', 'Usuario SMTP', 'email', TRUE
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'smtp_user');

INSERT INTO system_config (id, key, value, description, category, is_sensitive)
SELECT gen_random_uuid(), 'smtp_password', '', 'Contraseña SMTP', 'email', TRUE
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'smtp_password');

INSERT INTO system_config (id, key, value, description, category, is_sensitive)
SELECT gen_random_uuid(), 'smtp_from_email', '', 'Email remitente', 'email', FALSE
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'smtp_from_email');

INSERT INTO system_config (id, key, value, description, category, is_sensitive)
SELECT gen_random_uuid(), 'smtp_from_name', '', 'Nombre del remitente', 'email', FALSE
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'smtp_from_name');

INSERT INTO system_config (id, key, value, description, category, is_sensitive)
SELECT gen_random_uuid(), 'smtp_secure', 'true', 'Usar TLS/SSL', 'email', FALSE
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'smtp_secure');

-- Insert AI config keys if needed
INSERT INTO system_config (id, key, value, description, category, is_sensitive)
SELECT gen_random_uuid(), 'ai_enabled', 'false', 'Habilitar funcionalidades de IA', 'ai', FALSE
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'ai_enabled');

INSERT INTO system_config (id, key, value, description, category, is_sensitive)
SELECT gen_random_uuid(), 'ai_provider', '', 'Proveedor de IA (openai, anthropic, gemini)', 'ai', FALSE
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'ai_provider');

INSERT INTO system_config (id, key, value, description, category, is_sensitive)
SELECT gen_random_uuid(), 'ai_api_key', '', 'API Key de IA', 'ai', TRUE
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'ai_api_key');

-- Drop old policy and recreate with is_sensitive column check
DROP POLICY IF EXISTS public_read_config ON system_config;

CREATE POLICY public_read_nonsensitive_config ON system_config
  FOR SELECT
  TO authenticated
  USING (is_sensitive = FALSE);

-- Also allow anon to read non-sensitive config (for landing pages)
CREATE POLICY anon_read_nonsensitive_config ON system_config
  FOR SELECT
  TO anon
  USING (is_sensitive = FALSE);

-- For super_admin, allow reading ALL configs including sensitive ones
CREATE POLICY admins_read_all_config ON system_config
  FOR SELECT
  TO authenticated
  USING (get_my_role() = ANY (ARRAY['super_admin'::text, 'admin'::text]));

-- Add updated_at trigger if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_system_config_updated_at ON system_config;
CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON system_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();