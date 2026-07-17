/*
# Add favicon_value to system_config

1. Purpose
- Adds a new `favicon_value` configuration key to the `system_config` table.
- This key stores the favicon URL or SVG code that will be used as the browser tab icon.
- The frontend SEO hook (`useSeo`) reads this value and applies it to the document head.

2. Changes
- Inserts a new row in `system_config` with key `favicon_value` and empty value.
- Uses `ON CONFLICT DO NOTHING` to be idempotent.

3. Security
- No RLS policy changes — `system_config` already has public read and admin write policies.
*/

INSERT INTO system_config (key, value, category, description)
VALUES ('favicon_value', '', 'seo', 'Favicon URL or SVG code for browser tab icon')
ON CONFLICT (key) DO NOTHING;
