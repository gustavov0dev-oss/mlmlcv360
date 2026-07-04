
-- Add color_name to variants (so hex colors show a human name)
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS color_name text;

-- Add digital demo URL to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS digital_demo_url text;

-- Add general stock (used when no variants, or variant has no stock override)
ALTER TABLE products ADD COLUMN IF NOT EXISTS general_stock integer NOT NULL DEFAULT 0;

-- Add avg_rating + review_count denormalized columns if missing
ALTER TABLE products ADD COLUMN IF NOT EXISTS avg_rating numeric(3,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;

-- Add verified_purchase to reviews if missing
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS verified_purchase boolean NOT NULL DEFAULT false;
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS helpful_count integer NOT NULL DEFAULT 0;

-- Function to update product rating stats
CREATE OR REPLACE FUNCTION update_product_rating_stats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE products SET
    avg_rating = (
      SELECT COALESCE(AVG(rating)::numeric(3,2), 0)
      FROM product_reviews WHERE product_id = COALESCE(NEW.product_id, OLD.product_id) AND status = 'approved'
    ),
    review_count = (
      SELECT COUNT(*) FROM product_reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id) AND status = 'approved'
    )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_product_rating ON product_reviews;
CREATE TRIGGER trg_product_rating
  AFTER INSERT OR UPDATE OR DELETE ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION update_product_rating_stats();
