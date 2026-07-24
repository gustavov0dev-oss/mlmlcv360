
-- Drop the recursive policies that cause infinite recursion
DROP POLICY IF EXISTS "admin_select_all_profiles" ON profiles;
DROP POLICY IF EXISTS "admin_update_all_profiles" ON profiles;

-- Replace with security definer functions to break the recursion
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

-- Now recreate without recursion: use the function instead of a subquery on profiles
CREATE POLICY "admin_select_all_profiles" ON profiles FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'admin', 'inspector')
  );

CREATE POLICY "admin_update_all_profiles" ON profiles FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'admin')
  )
  WITH CHECK (
    public.get_my_role() IN ('super_admin', 'admin')
  );

-- Also fix the other tables that reference profiles inside their policies
-- commissions
DROP POLICY IF EXISTS "update_commissions" ON commissions;
DROP POLICY IF EXISTS "delete_commissions" ON commissions;

CREATE POLICY "update_commissions" ON commissions FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "delete_commissions" ON commissions FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin'));

-- activity_logs
DROP POLICY IF EXISTS "admin_select_activity" ON activity_logs;

CREATE POLICY "admin_select_activity" ON activity_logs FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin', 'inspector'));

-- system_config and payment_gateways (recreate without subquery on profiles)
DROP POLICY IF EXISTS "admins_read_config" ON system_config;
DROP POLICY IF EXISTS "admins_insert_config" ON system_config;
DROP POLICY IF EXISTS "admins_update_config" ON system_config;
DROP POLICY IF EXISTS "admins_delete_config" ON system_config;

CREATE POLICY "admins_read_config" ON system_config FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin'));
CREATE POLICY "admins_insert_config" ON system_config FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin'));
CREATE POLICY "admins_update_config" ON system_config FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin'));
CREATE POLICY "admins_delete_config" ON system_config FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS "admins_read_gateways" ON payment_gateways;
DROP POLICY IF EXISTS "admins_insert_gateways" ON payment_gateways;
DROP POLICY IF EXISTS "admins_update_gateways" ON payment_gateways;
DROP POLICY IF EXISTS "admins_delete_gateways" ON payment_gateways;

CREATE POLICY "admins_read_gateways" ON payment_gateways FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin'));
CREATE POLICY "admins_insert_gateways" ON payment_gateways FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin'));
CREATE POLICY "admins_update_gateways" ON payment_gateways FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin'));
CREATE POLICY "admins_delete_gateways" ON payment_gateways FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin'));
