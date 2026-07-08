/*
# Create testimonial_region_stats table

1. New Tables
   - `testimonial_region_stats`
     - `id` (uuid, primary key)
     - `city` (text) — city name shown below the number
     - `members` (text) — display value e.g. "4,820+"
     - `image_url` (text) — background photo URL
     - `is_active` (boolean, default true)
     - `sort_order` (int, default 0)
     - `created_at` / `updated_at`

2. Security
   - RLS enabled.
   - Public anon SELECT for active rows (landing page).
   - Authenticated full CRUD (admin manages via dashboard).

3. Notes
   - Landing page renders the first 4 active rows ordered by sort_order.
   - image_url can be external URL or Supabase storage URL.
*/

CREATE TABLE IF NOT EXISTS testimonial_region_stats (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city        text NOT NULL,
  members     text NOT NULL DEFAULT '',
  image_url   text NOT NULL DEFAULT '',
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE testimonial_region_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_region_stats" ON testimonial_region_stats;
CREATE POLICY "public_read_region_stats" ON testimonial_region_stats FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "auth_read_all_region_stats" ON testimonial_region_stats;
CREATE POLICY "auth_read_all_region_stats" ON testimonial_region_stats FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_region_stats" ON testimonial_region_stats;
CREATE POLICY "auth_insert_region_stats" ON testimonial_region_stats FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_region_stats" ON testimonial_region_stats;
CREATE POLICY "auth_update_region_stats" ON testimonial_region_stats FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_region_stats" ON testimonial_region_stats;
CREATE POLICY "auth_delete_region_stats" ON testimonial_region_stats FOR DELETE
  TO authenticated USING (true);

INSERT INTO testimonial_region_stats (city, members, image_url, is_active, sort_order) VALUES
  ('Lima',     '4,820+', 'https://images.pexels.com/photos/3052361/pexels-photo-3052361.jpeg?auto=compress&cs=tinysrgb&w=800', true, 1),
  ('Arequipa', '1,940+', 'https://images.pexels.com/photos/1029624/pexels-photo-1029624.jpeg?auto=compress&cs=tinysrgb&w=800', true, 2),
  ('Trujillo', '1,560+', 'https://images.pexels.com/photos/2559941/pexels-photo-2559941.jpeg?auto=compress&cs=tinysrgb&w=800', true, 3),
  ('Cusco',    '980+',   'https://images.pexels.com/photos/2356059/pexels-photo-2356059.jpeg?auto=compress&cs=tinysrgb&w=800', true, 4)
ON CONFLICT DO NOTHING;
