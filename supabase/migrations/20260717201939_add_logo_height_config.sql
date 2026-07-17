-- Add logo_height config key for independent height control
INSERT INTO system_config (key, value, description, category, is_sensitive)
VALUES ('logo_height', '36', 'Altura independiente del logo en pixeles', 'general', false)
ON CONFLICT (key) DO NOTHING;
