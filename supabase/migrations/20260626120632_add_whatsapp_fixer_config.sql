
-- Add WhatsApp config to system_config
INSERT INTO system_config (key, value, description, category) VALUES
  ('whatsapp_enabled', 'true', 'Botón flotante de WhatsApp habilitado', 'whatsapp'),
  ('whatsapp_number', '+51987654321', 'Número de WhatsApp para contacto', 'whatsapp'),
  ('whatsapp_message', 'Hola, vengo desde MLM 360 y quiero más información.', 'Mensaje predeterminado', 'whatsapp'),
  ('whatsapp_position', 'right', 'Posición del botón (left o right)', 'whatsapp'),
  ('fixer_api_key', '', 'API Key de Fixer.io para conversión de monedas', 'currency'),
  ('fixer_enabled', 'false', 'Conversión automática de monedas habilitada', 'currency')
ON CONFLICT (key) DO NOTHING;
