-- Migration 1: Product Catalog
CREATE TABLE IF NOT EXISTS product_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  description text,
  image_url   text,
  parent_id   uuid REFERENCES product_categories(id) ON DELETE SET NULL,
  sort_order  int NOT NULL DEFAULT 0,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  slug             text UNIQUE NOT NULL,
  description      text,
  short_description text,
  images           jsonb NOT NULL DEFAULT '[]',
  videos           jsonb NOT NULL DEFAULT '[]',
  category_id      uuid REFERENCES product_categories(id) ON DELETE SET NULL,
  base_price       numeric(12,2) NOT NULL DEFAULT 0,
  compare_price    numeric(12,2),
  cost_price       numeric(12,2),
  currency         text NOT NULL DEFAULT 'PEN' CHECK (currency IN ('PEN','USD')),
  status           text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  weight           numeric(8,3),
  sku              text,
  track_stock      boolean NOT NULL DEFAULT true,
  allow_backorder  boolean NOT NULL DEFAULT false,
  tags             jsonb NOT NULL DEFAULT '[]',
  meta_title       text,
  meta_description text,
  sort_order       int NOT NULL DEFAULT 0,
  featured         boolean NOT NULL DEFAULT false,
  created_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_slug      ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_status    ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category  ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured  ON products(featured);

CREATE TABLE IF NOT EXISTS product_variants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name          text NOT NULL,
  sku           text,
  price         numeric(12,2),
  compare_price numeric(12,2),
  stock         int NOT NULL DEFAULT 0,
  attributes    jsonb NOT NULL DEFAULT '{}',
  images        jsonb NOT NULL DEFAULT '[]',
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  sort_order    int NOT NULL DEFAULT 0,
  weight        numeric(8,3),
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

CREATE TABLE IF NOT EXISTS product_reviews (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating            int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title             text,
  body              text,
  images            jsonb NOT NULL DEFAULT '[]',
  verified_purchase boolean NOT NULL DEFAULT false,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON product_reviews(product_id);

CREATE TABLE IF NOT EXISTS wishlists (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, product_id)
);

-- RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews    ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pub_read_categories" ON product_categories FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY "admin_all_categories" ON product_categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin')));

CREATE POLICY "pub_read_products" ON products FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY "admin_all_products" ON products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin')));

CREATE POLICY "pub_read_variants" ON product_variants FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY "admin_all_variants" ON product_variants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin')));

CREATE POLICY "pub_read_reviews" ON product_reviews FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "user_insert_review" ON product_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin_manage_reviews" ON product_reviews FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin')))
  WITH CHECK (true);

CREATE POLICY "user_own_wishlist_s" ON wishlists FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_own_wishlist_i" ON wishlists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_own_wishlist_d" ON wishlists FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Seed sample categories
INSERT INTO product_categories (name, slug, description, sort_order)
VALUES
  ('Salud y Bienestar', 'salud-bienestar', 'Productos para tu salud', 1),
  ('Belleza y Cuidado', 'belleza-cuidado', 'Productos de belleza', 2),
  ('Suplementos', 'suplementos', 'Suplementos nutricionales', 3),
  ('Hogar', 'hogar', 'Productos para el hogar', 4)
ON CONFLICT (slug) DO NOTHING;
