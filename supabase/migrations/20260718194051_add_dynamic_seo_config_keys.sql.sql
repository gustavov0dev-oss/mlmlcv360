-- Add dynamic SEO configuration keys to system_config
INSERT INTO system_config (key, value, is_sensitive) VALUES
  ('seo_title', 'MLM 360 - Sistema Empresarial Premium', false),
  ('seo_description', 'Sistema MLM empresarial premium. Gestiona tu red de afiliados, comisiones y negocio multinivel con tecnologia de punta.', false),
  ('seo_keywords', 'mlm, multinivel, afiliados, comisiones, red, marketing, sistema, software', false),
  ('seo_og_image', '', false),
  ('seo_ga_id', '', false),
  ('website_url', '', false),
  ('address_country', 'PE', false),
  ('address_region', '', false),
  ('address_city', '', false),
  ('address_street', '', false),
  ('slogan', '', false)
ON CONFLICT (key) DO NOTHING;

-- Ensure maintenance countdown keys exist (idempotent)
INSERT INTO system_config (key, value, is_sensitive) VALUES
  ('maintenance_countdown_enabled', 'false', false),
  ('maintenance_countdown_date', '', false)
ON CONFLICT (key) DO NOTHING;
