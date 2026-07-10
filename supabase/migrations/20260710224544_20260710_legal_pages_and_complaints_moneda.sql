/*
# Legal pages table + moneda column on complaints_book

1. New Tables
- `legal_pages` — stores legal/ informational pages (terms, privacy, cookies, etc.)
  - `id` uuid PK
  - `slug` text UNIQUE (URL identifier, e.g. "terminos-y-condiciones")
  - `title` text (display title)
  - `content` text (HTML or markdown body)
  - `is_published` boolean default false
  - `sort_order` integer default 0 (for drag ordering in admin)
  - `show_in_footer` boolean default true (whether to link in footer)
  - `created_at` timestamptz default now()
  - `updated_at` timestamptz default now()

2. Modified Tables
- `complaints_book` — add `moneda` text column default 'PEN' to store currency (PEN/USD)
  alongside `monto`.

3. Security
- `legal_pages` RLS enabled.
  - SELECT: public (anon + authenticated) can read published pages.
  - INSERT/UPDATE/DELETE: authenticated only (admin manages content).
- `complaints_book` already has RLS; no policy changes needed.

4. Notes
- This is idempotent: uses IF NOT EXISTS for table and column.
- Legal pages are public-readable so the frontend (anon key) can render them.
*/

CREATE TABLE IF NOT EXISTS legal_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  show_in_footer boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE legal_pages ENABLE ROW LEVEL SECURITY;

-- Public can read published legal pages
DROP POLICY IF EXISTS "public_read_legal_pages" ON legal_pages;
CREATE POLICY "public_read_legal_pages"
  ON legal_pages FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- Authenticated (admin) can insert
DROP POLICY IF EXISTS "admin_insert_legal_pages" ON legal_pages;
CREATE POLICY "admin_insert_legal_pages"
  ON legal_pages FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated (admin) can update
DROP POLICY IF EXISTS "admin_update_legal_pages" ON legal_pages;
CREATE POLICY "admin_update_legal_pages"
  ON legal_pages FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

-- Authenticated (admin) can delete
DROP POLICY IF EXISTS "admin_delete_legal_pages" ON legal_pages;
CREATE POLICY "admin_delete_legal_pages"
  ON legal_pages FOR DELETE
  TO authenticated
  USING (true);

-- Add moneda column to complaints_book (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'complaints_book' AND column_name = 'moneda'
  ) THEN
    ALTER TABLE complaints_book ADD COLUMN moneda text NOT NULL DEFAULT 'PEN';
  END IF;
END $$;

-- Seed default legal pages if table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM legal_pages LIMIT 1) THEN
    INSERT INTO legal_pages (slug, title, content, is_published, sort_order, show_in_footer) VALUES
      ('terminos-y-condiciones', 'Términos y Condiciones', '<p>Contenido inicial. Edita esta página desde el panel de administración.</p>', false, 1, true),
      ('politica-de-privacidad', 'Política de Privacidad', '<p>Contenido inicial. Edita esta página desde el panel de administración.</p>', false, 2, true),
      ('politica-de-cookies', 'Política de Cookies', '<p>Contenido inicial. Edita esta página desde el panel de administración.</p>', false, 3, true),
      ('aviso-legal', 'Aviso Legal', '<p>Contenido inicial. Edita esta página desde el panel de administración.</p>', false, 4, true);
  END IF;
END $$;
