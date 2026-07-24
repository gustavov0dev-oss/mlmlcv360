-- Create public logos bucket for logo uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  2097152,
  ARRAY['image/png','image/jpeg','image/jpg','image/gif','image/webp','image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users (admin) to upload/update/delete logos
CREATE POLICY "logos_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos');

CREATE POLICY "logos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'logos');

CREATE POLICY "logos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'logos');

-- Allow everyone to read logos (public bucket)
CREATE POLICY "logos_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'logos');
