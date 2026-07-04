-- Migration 5: Orders, Coupons, Tracking + place_order RPC
CREATE TABLE IF NOT EXISTS coupons (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text UNIQUE NOT NULL,
  type             text NOT NULL CHECK (type IN ('percentage','fixed')),
  value            numeric(12,2) NOT NULL,
  min_order_amount numeric(12,2) DEFAULT 0,
  max_discount     numeric(12,2),
  usage_limit      int,
  used_count       int NOT NULL DEFAULT 0,
  expires_at       timestamptz,
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  applies_to       text NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all','categories','products')),
  category_ids     jsonb NOT NULL DEFAULT '[]',
  product_ids      jsonb NOT NULL DEFAULT '[]',
  created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number         text UNIQUE NOT NULL,
  user_id              uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  status               text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  payment_status       text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','failed','refunded')),
  payment_method       text,
  payment_reference    text,
  subtotal             numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount      numeric(12,2) NOT NULL DEFAULT 0,
  shipping_amount      numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount           numeric(12,2) NOT NULL DEFAULT 0,
  total                numeric(12,2) NOT NULL DEFAULT 0,
  currency             text NOT NULL DEFAULT 'PEN',
  exchange_rate        numeric(10,4) NOT NULL DEFAULT 1,
  shipping_address     jsonb NOT NULL DEFAULT '{}',
  billing_address      jsonb NOT NULL DEFAULT '{}',
  coupon_id            uuid REFERENCES coupons(id) ON DELETE SET NULL,
  coupon_code          text,
  shipping_method_name text,
  notes                text,
  tracking_number      text,
  tracking_url         text,
  shipped_at           timestamptz,
  delivered_at         timestamptz,
  cancelled_at         timestamptz,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_user    ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number  ON orders(order_number);

CREATE TABLE IF NOT EXISTS order_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      uuid REFERENCES products(id) ON DELETE SET NULL,
  variant_id      uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name    text NOT NULL,
  variant_name    text,
  sku             text,
  quantity        int NOT NULL DEFAULT 1,
  unit_price      numeric(12,2) NOT NULL,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  total           numeric(12,2) NOT NULL,
  image_url       text
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS order_tracking (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status      text NOT NULL,
  description text,
  location    text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tracking_order ON order_tracking(order_id);

ALTER TABLE coupons        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pub_read_coupons"   ON coupons FOR SELECT TO anon, authenticated USING (status='active');
CREATE POLICY "admin_all_coupons"  ON coupons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('super_admin','admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('super_admin','admin')));

CREATE POLICY "user_orders_s"      ON orders FOR SELECT TO authenticated
  USING (auth.uid()=user_id OR EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('super_admin','admin','support','inspector')));
CREATE POLICY "user_orders_i"      ON orders FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "admin_orders_u"     ON orders FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('super_admin','admin','support')))
  WITH CHECK (true);

CREATE POLICY "order_items_s" ON order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id=order_items.order_id AND (o.user_id=auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND p.role IN ('super_admin','admin','support','inspector')))));
CREATE POLICY "order_items_i" ON order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM orders o WHERE o.id=order_items.order_id AND o.user_id=auth.uid()));
CREATE POLICY "admin_order_items_all" ON order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('super_admin','admin')));

CREATE POLICY "tracking_s" ON order_tracking FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id=order_tracking.order_id AND (o.user_id=auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND p.role IN ('super_admin','admin','support')))));
CREATE POLICY "admin_tracking_i" ON order_tracking FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('super_admin','admin','support')));

-- place_order RPC (atomic)
CREATE OR REPLACE FUNCTION public.place_order(
  p_user_id        uuid,
  p_items          jsonb,
  p_shipping_addr  jsonb,
  p_billing_addr   jsonb,
  p_shipping_name  text,
  p_shipping_cost  numeric,
  p_coupon_code    text DEFAULT NULL,
  p_currency       text DEFAULT 'PEN',
  p_exchange_rate  numeric DEFAULT 1,
  p_notes          text DEFAULT NULL,
  p_payment_method text DEFAULT 'pending'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id      uuid;
  v_order_number  text;
  v_subtotal      numeric := 0;
  v_discount      numeric := 0;
  v_tax           numeric := 0;
  v_total         numeric := 0;
  v_coupon        coupons%ROWTYPE;
  v_item          jsonb;
  v_product       products%ROWTYPE;
  v_variant_row   product_variants%ROWTYPE;
  v_item_price    numeric;
  v_item_total    numeric;
  v_commission_row mlm_commissions_config%ROWTYPE;
  v_sponsor_id    uuid;
  v_level         int;
  v_sponsor_rank  text;
  v_commission_amt numeric;
  v_first_image   text;
BEGIN
  v_order_number := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(gen_random_uuid()::text, 1, 6));

  IF p_coupon_code IS NOT NULL AND p_coupon_code != '' THEN
    SELECT * INTO v_coupon FROM coupons
    WHERE code = upper(trim(p_coupon_code)) AND status='active'
      AND (expires_at IS NULL OR expires_at > now())
      AND (usage_limit IS NULL OR used_count < usage_limit);
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success',false,'error','Cupón inválido o expirado');
    END IF;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_product FROM products WHERE id=(v_item->>'product_id')::uuid;
    IF NOT FOUND THEN CONTINUE; END IF;
    IF (v_item->>'variant_id') IS NOT NULL AND (v_item->>'variant_id') != '' THEN
      SELECT * INTO v_variant_row FROM product_variants WHERE id=(v_item->>'variant_id')::uuid;
      v_item_price := COALESCE(v_variant_row.price, v_product.base_price);
      IF v_product.track_stock THEN
        UPDATE product_variants SET stock=stock-(v_item->>'quantity')::int
        WHERE id=v_variant_row.id AND stock>=(v_item->>'quantity')::int;
        IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Sin stock: '||v_product.name); END IF;
      END IF;
    ELSE
      v_item_price := v_product.base_price;
      v_variant_row.id := NULL; v_variant_row.name := NULL; v_variant_row.sku := NULL;
    END IF;
    v_subtotal := v_subtotal + v_item_price * (v_item->>'quantity')::int;
  END LOOP;

  IF v_coupon.id IS NOT NULL AND v_subtotal >= COALESCE(v_coupon.min_order_amount,0) THEN
    v_discount := CASE WHEN v_coupon.type='percentage'
      THEN LEAST(v_subtotal*v_coupon.value/100, COALESCE(v_coupon.max_discount,99999))
      ELSE v_coupon.value END;
    UPDATE coupons SET used_count=used_count+1 WHERE id=v_coupon.id;
  END IF;

  v_total := v_subtotal - v_discount + p_shipping_cost;
  v_tax   := round((v_total - v_total/1.18)::numeric, 2);

  INSERT INTO orders (order_number,user_id,status,payment_status,payment_method,
    subtotal,discount_amount,shipping_amount,tax_amount,total,currency,exchange_rate,
    shipping_address,billing_address,coupon_id,coupon_code,shipping_method_name,notes,updated_at)
  VALUES (v_order_number,p_user_id,'pending','pending',p_payment_method,
    v_subtotal,v_discount,p_shipping_cost,v_tax,v_total,p_currency,p_exchange_rate,
    p_shipping_addr,p_billing_addr,v_coupon.id,p_coupon_code,p_shipping_name,p_notes,now())
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_product FROM products WHERE id=(v_item->>'product_id')::uuid;
    IF NOT FOUND THEN CONTINUE; END IF;
    IF (v_item->>'variant_id') IS NOT NULL AND (v_item->>'variant_id') != '' THEN
      SELECT * INTO v_variant_row FROM product_variants WHERE id=(v_item->>'variant_id')::uuid;
      v_item_price := COALESCE(v_variant_row.price, v_product.base_price);
    ELSE
      v_item_price := v_product.base_price;
      v_variant_row.id:=NULL; v_variant_row.name:=NULL; v_variant_row.sku:=NULL;
    END IF;
    v_first_image := (v_product.images->0->>'url');
    INSERT INTO order_items(order_id,product_id,variant_id,product_name,variant_name,sku,quantity,unit_price,total,image_url)
    VALUES(v_order_id,v_product.id,v_variant_row.id,v_product.name,v_variant_row.name,
      COALESCE(v_variant_row.sku,v_product.sku),(v_item->>'quantity')::int,
      v_item_price,v_item_price*(v_item->>'quantity')::int,v_first_image);
  END LOOP;

  INSERT INTO order_tracking(order_id,status,description)
  VALUES(v_order_id,'pending','Pedido recibido y en espera de confirmación');

  -- MLM commissions
  SELECT sponsor_id INTO v_sponsor_id FROM profiles WHERE id=p_user_id;
  v_level := 1;
  WHILE v_sponsor_id IS NOT NULL AND v_level<=10 LOOP
    SELECT rank INTO v_sponsor_rank FROM profiles WHERE id=v_sponsor_id;
    SELECT * INTO v_commission_row FROM mlm_commissions_config
    WHERE rank=v_sponsor_rank AND level=v_level AND status='active';
    IF FOUND AND v_total>=COALESCE(v_commission_row.min_purchase_amount,0) THEN
      v_commission_amt := CASE WHEN v_commission_row.type='percentage'
        THEN round((v_total*v_commission_row.value/100)::numeric,2)
        ELSE v_commission_row.value END;
      INSERT INTO commissions(user_id,type,amount,currency,status,description,reference_id)
      VALUES(v_sponsor_id,'unilevel',v_commission_amt,p_currency,'pending',
        'Comisión nivel '||v_level||' - Pedido #'||v_order_number, v_order_id::text)
      ON CONFLICT DO NOTHING;
    END IF;
    SELECT sponsor_id INTO v_sponsor_id FROM profiles WHERE id=v_sponsor_id;
    v_level := v_level+1;
  END LOOP;

  DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id=p_user_id);
  DELETE FROM carts WHERE user_id=p_user_id;

  RETURN jsonb_build_object('success',true,'order_id',v_order_id,'order_number',v_order_number,'total',v_total);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success',false,'error',SQLERRM);
END;
$$;

-- Seed demo products
DO $$
DECLARE v_cat_id uuid;
BEGIN
  SELECT id INTO v_cat_id FROM product_categories WHERE slug='salud-bienestar' LIMIT 1;
  INSERT INTO products (name, slug, description, short_description, images, base_price, compare_price, currency, status, featured, sku, track_stock)
  VALUES
    ('Omega-3 Premium 1000mg', 'omega-3-premium', 'Suplemento de Omega-3 de alta pureza con EPA y DHA. Beneficioso para el corazón, cerebro y articulaciones. Cada cápsula contiene 1000mg de aceite de pescado natural.', 'Omega-3 de alta pureza para corazón y cerebro', '[{"url":"https://images.pexels.com/photos/3850838/pexels-photo-3850838.jpeg","alt":"Omega-3 Premium"}]', 89.90, 120.00, 'PEN', 'active', true, 'OM3-1000', true),
    ('Colágeno Hidrolizado Plus', 'colageno-hidrolizado', 'Colágeno hidrolizado con vitamina C para piel, cabello y uñas. Fórmula avanzada que mejora la elasticidad y luminosidad de la piel.', 'Colágeno con vitamina C para piel radiante', '[{"url":"https://images.pexels.com/photos/3683053/pexels-photo-3683053.jpeg","alt":"Colágeno Hidrolizado"}]', 129.90, 179.90, 'PEN', 'active', true, 'COL-HID', true),
    ('Multivitamínico Completo', 'multivitaminico-completo', 'Complejo multivitamínico con 23 vitaminas y minerales esenciales. Energía, inmunidad y bienestar en un solo suplemento diario.', '23 vitaminas y minerales esenciales', '[{"url":"https://images.pexels.com/photos/3683068/pexels-photo-3683068.jpeg","alt":"Multivitamínico"}]', 69.90, 99.90, 'PEN', 'active', false, 'MUL-COM', true)
  ON CONFLICT (slug) DO NOTHING;

  -- Add variants for Omega-3
  INSERT INTO product_variants (product_id, name, sku, price, stock, attributes)
  SELECT id, '60 cápsulas', 'OM3-60', 89.90, 50, '{"presentacion":"60 cápsulas"}'
  FROM products WHERE slug='omega-3-premium' ON CONFLICT DO NOTHING;
  INSERT INTO product_variants (product_id, name, sku, price, stock, attributes)
  SELECT id, '120 cápsulas', 'OM3-120', 159.90, 30, '{"presentacion":"120 cápsulas"}'
  FROM products WHERE slug='omega-3-premium' ON CONFLICT DO NOTHING;
END $$;
