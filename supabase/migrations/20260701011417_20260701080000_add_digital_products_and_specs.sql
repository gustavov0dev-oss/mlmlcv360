-- Add digital product support
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_digital boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS digital_file_url text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS digital_instructions text;

-- Add specs column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'specs') THEN
    ALTER TABLE products ADD COLUMN specs jsonb NOT NULL DEFAULT '{}';
  END IF;
END $$;

-- Update variant to support attribute_type and images
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS attribute_type text NOT NULL DEFAULT 'text';

-- Add index for faster specs lookup
CREATE INDEX IF NOT EXISTS idx_products_is_digital ON products(is_digital) WHERE is_digital = true;

COMMENT ON COLUMN products.is_digital IS 'If true, this is a digital product downloadable after purchase';
COMMENT ON COLUMN products.digital_file_url IS 'URL to the digital file for download';
COMMENT ON COLUMN products.digital_instructions IS 'Instructions for accessing the digital product';
COMMENT ON COLUMN products.specs IS 'Key-value specifications like MercadoLibre format';
COMMENT ON COLUMN product_variants.attribute_type IS 'Type of attribute: text, color, or image';