-- Migration 2: Cart system
CREATE TABLE IF NOT EXISTS carts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
  session_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_carts_user    ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_session ON carts(session_id);

CREATE TABLE IF NOT EXISTS cart_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id      uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id   uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id   uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity     int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_at_add numeric(12,2) NOT NULL,
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);

ALTER TABLE carts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_cart_s" ON carts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_own_cart_i" ON carts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_own_cart_u" ON carts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_own_cart_d" ON carts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "anon_cart_s" ON carts FOR SELECT TO anon USING (user_id IS NULL);
CREATE POLICY "anon_cart_i" ON carts FOR INSERT TO anon WITH CHECK (user_id IS NULL);
CREATE POLICY "anon_cart_u" ON carts FOR UPDATE TO anon USING (user_id IS NULL) WITH CHECK (user_id IS NULL);
CREATE POLICY "anon_cart_d" ON carts FOR DELETE TO anon USING (user_id IS NULL);

CREATE POLICY "cart_items_s" ON cart_items FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_items.cart_id AND (c.user_id = auth.uid() OR c.user_id IS NULL)));
CREATE POLICY "cart_items_i" ON cart_items FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_items.cart_id AND (c.user_id = auth.uid() OR c.user_id IS NULL)));
CREATE POLICY "cart_items_u" ON cart_items FOR UPDATE TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_items.cart_id AND (c.user_id = auth.uid() OR c.user_id IS NULL)));
CREATE POLICY "cart_items_d" ON cart_items FOR DELETE TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_items.cart_id AND (c.user_id = auth.uid() OR c.user_id IS NULL)));

-- Admin can see all carts
CREATE POLICY "admin_all_carts" ON carts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin')));
