/*
# Add icon_svg column to social_links
Allows admins to paste a custom SVG path string for social icons.
*/
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_links' AND column_name = 'icon_svg'
  ) THEN
    ALTER TABLE social_links ADD COLUMN icon_svg text;
  END IF;
END $$;
