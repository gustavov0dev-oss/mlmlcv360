-- Saved shipping addresses for users
CREATE TABLE IF NOT EXISTS saved_addresses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label       text NOT NULL DEFAULT 'Mi dirección',
  is_default  boolean NOT NULL DEFAULT false,
  full_name   text NOT NULL,
  phone       text NOT NULL,
  address     text NOT NULL,
  district    text NOT NULL DEFAULT '',
  city        text NOT NULL,
  region      text NOT NULL,
  country     text NOT NULL DEFAULT 'PE',
  country_name text NOT NULL DEFAULT 'Perú',
  zip_code    text,
  reference   text,
  invoice_type text NOT NULL DEFAULT 'boleta' CHECK (invoice_type IN ('boleta','factura','receipt','invoice')),
  ruc         text,
  razon_social text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_addresses_user ON saved_addresses(user_id);

ALTER TABLE saved_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_addresses_s" ON saved_addresses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_own_addresses_i" ON saved_addresses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_own_addresses_u" ON saved_addresses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_own_addresses_d" ON saved_addresses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Wishlist table already exists but let's make sure wishlists has the right indexes
CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);

-- Product comparison (session-based, no persistence needed but let's add a user fav list anyway)
-- Already have wishlists, good.

-- Add product specs/attributes column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS specs jsonb NOT NULL DEFAULT '{}';

-- payment_gateways: ensure type column (some older migrations use 'slug' as identifier)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_gateways' AND column_name='type') THEN
    ALTER TABLE payment_gateways ADD COLUMN type text GENERATED ALWAYS AS (slug) STORED;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;
