INSERT INTO system_config (key, value, description, category, is_sensitive)
VALUES ('logo_value', '', 'URL de imagen, ruta de Storage o código SVG del logo del sistema', 'empresa', false)
ON CONFLICT (key) DO NOTHING;
