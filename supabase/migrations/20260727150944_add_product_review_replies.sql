/*
# Add product_review_replies table for threaded review replies

1. Purpose
   Enables YouTube-style threaded replies on product reviews.
   Both regular users and company/admins can reply to a review,
   creating a comment-thread experience instead of flat review cards.

2. New Tables
   - `product_review_replies`
     - `id` (uuid, primary key)
     - `review_id` (uuid, FK -> product_reviews.id ON DELETE CASCADE)
     - `user_id` (uuid, FK -> auth.users.id ON DELETE SET NULL, nullable so company/system replies can exist without an auth user)
     - `author_name` (text, displayed name for the reply author)
     - `author_role` (text, optional role label, e.g. "Empresa", "Soporte", "Usuario")
     - `is_company` (boolean, default false — flags official company replies)
     - `body` (text, the reply content)
     - `created_at` (timestamptz, default now())

3. Security (RLS)
   - Enable RLS on `product_review_replies`.
   - Public read: anyone (anon + authenticated) can read replies — reviews are public content.
   - Authenticated insert: a signed-in user can post a reply. `user_id` defaults to `auth.uid()`.
   - Authenticated update/delete: only the reply author can edit or delete their own reply.
   - Admin override: super_admin/admin roles can delete any reply (moderation).

4. Indexes
   - `product_review_replies_review_id_idx` on `review_id` for fast reply lookups per review.
   - `product_review_replies_created_at_idx` on `created_at` for chronological ordering.

5. Important Notes
   - `user_id` is nullable + defaults to `auth.uid()` so regular users insert without passing it.
   - Company replies may set `is_company = true` and provide `author_name` / `author_role` directly.
   - Deleting a review cascades to its replies (FK ON DELETE CASCADE).
*/

CREATE TABLE IF NOT EXISTS product_review_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  author_role text,
  is_company boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE product_review_replies ENABLE ROW LEVEL SECURITY;

-- Public read: reviews and their replies are public content
DROP POLICY IF EXISTS "public_select_review_replies" ON product_review_replies;
CREATE POLICY "public_select_review_replies"
ON product_review_replies FOR SELECT
TO anon, authenticated USING (true);

-- Authenticated insert: any signed-in user can reply
DROP POLICY IF EXISTS "auth_insert_review_replies" ON product_review_replies;
CREATE POLICY "auth_insert_review_replies"
ON product_review_replies FOR INSERT
TO authenticated WITH CHECK (true);

-- Owner update: only the reply author can edit their reply
DROP POLICY IF EXISTS "owner_update_review_replies" ON product_review_replies;
CREATE POLICY "owner_update_review_replies"
ON product_review_replies FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Owner delete: author can delete their own reply
DROP POLICY IF EXISTS "owner_delete_review_replies" ON product_review_replies;
CREATE POLICY "owner_delete_review_replies"
ON product_review_replies FOR DELETE
TO authenticated USING (user_id = auth.uid());

-- Admin delete: super_admin/admin can delete any reply (moderation)
DROP POLICY IF EXISTS "admin_delete_review_replies" ON product_review_replies;
CREATE POLICY "admin_delete_review_replies"
ON product_review_replies FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
  )
);

CREATE INDEX IF NOT EXISTS product_review_replies_review_id_idx ON product_review_replies(review_id);
CREATE INDEX IF NOT EXISTS product_review_replies_created_at_idx ON product_review_replies(created_at);
