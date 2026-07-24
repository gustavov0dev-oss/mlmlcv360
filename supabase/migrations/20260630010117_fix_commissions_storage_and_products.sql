-- Fix commissions table: add reference_id column for order tracking
ALTER TABLE commissions 
  ADD COLUMN IF NOT EXISTS reference_id text;

CREATE INDEX IF NOT EXISTS idx_commissions_reference ON commissions(reference_id);
CREATE INDEX IF NOT EXISTS idx_commissions_user_status ON commissions(user_id, status);

-- Also fix the place_order function to not use reference_id in ON CONFLICT
-- (was causing issues since there's no unique constraint on reference_id)
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

  -- MLM commissions walk
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
        'Comisión nivel '||v_level||' - Pedido #'||v_order_number, v_order_id::text);
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

-- Supabase storage setup for product media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,
  52428800,  -- 50MB max
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS for products bucket
CREATE POLICY "products_public_read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'products');

CREATE POLICY "admin_upload_products" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'products' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin'))
  );

CREATE POLICY "admin_delete_products" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'products' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin'))
  );

-- Add coupon_ids to products for smart coupon display
ALTER TABLE products ADD COLUMN IF NOT EXISTS applicable_coupon_ids jsonb NOT NULL DEFAULT '[]';
