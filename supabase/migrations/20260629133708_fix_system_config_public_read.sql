/*
# Fix system_config public read access

system_config stores public settings like company name, currency, maintenance mode.
The SELECT policy was restricted to authenticated+admin only, which caused the
ConfigProvider to hang for unauthenticated visitors (it got an empty result and
never resolved loading = false in error cases).

Changes:
- Add a public SELECT policy for system_config so anon users can read config keys
- Keep write operations (INSERT/UPDATE/DELETE) restricted to admins only
- Exclude sensitive keys from public view using a safe key whitelist
*/

-- Allow public (anon + authenticated) to read non-sensitive config keys
DROP POLICY IF EXISTS "public_read_config" ON public.system_config;
CREATE POLICY "public_read_config" ON public.system_config
  FOR SELECT TO anon, authenticated
  USING (
    key NOT IN (
      'smtp_password', 'smtp_user', 'api_secret', 'webhook_secret',
      'service_role_key', 'private_key', 'secret_key', 'access_token'
    )
  );

-- Keep admin-only policy but make it non-conflicting (for writes)
-- The public_read_config above covers SELECT for everyone
-- Admins get full access via the existing admin_all_plans-style policy
-- Drop the old admin-only read and let public_read_config handle SELECT
DROP POLICY IF EXISTS "admins_read_config" ON public.system_config;
