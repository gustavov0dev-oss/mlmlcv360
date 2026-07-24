-- Add IGV/tax configuration
INSERT INTO system_config (key, value, description, category) VALUES
  ('igv_enabled', 'true', 'Habilitar IGV en los pedidos', 'tax'),
  ('igv_rate', '18', 'Porcentaje de IGV (ej: 18 para 18%)', 'tax'),
  ('igv_included_in_price', 'true', 'El IGV esta incluido en el precio del producto', 'tax'),
  ('tax_name', 'IGV', 'Nombre del impuesto a mostrar (IGV, VAT, etc.)', 'tax')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  category = EXCLUDED.category;