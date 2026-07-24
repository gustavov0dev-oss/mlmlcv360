/*
# Auth fixes + Dynamic Roles system

1. Auto-confirm unconfirmed users (only email_confirmed_at)
2. Create custom_roles table for dynamic role management
3. Create role_permissions table
4. Seed default roles + permissions
*/

-- 1. Auto-confirm unconfirmed users
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL
  AND deleted_at IS NULL;

-- 2. Custom roles table
CREATE TABLE IF NOT EXISTS custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  label text NOT NULL,
  color text NOT NULL DEFAULT '#6B7280',
  description text,
  is_system boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 99,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_custom_roles" ON custom_roles;
CREATE POLICY "select_custom_roles" ON custom_roles FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_custom_roles" ON custom_roles;
CREATE POLICY "admin_insert_custom_roles" ON custom_roles FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','super_admin'))
);

DROP POLICY IF EXISTS "admin_update_custom_roles" ON custom_roles;
CREATE POLICY "admin_update_custom_roles" ON custom_roles FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','super_admin'))
);

DROP POLICY IF EXISTS "admin_delete_custom_roles" ON custom_roles;
CREATE POLICY "admin_delete_custom_roles" ON custom_roles FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','super_admin'))
);

-- 3. Role permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text NOT NULL REFERENCES custom_roles(name) ON DELETE CASCADE,
  permission text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role_name, permission)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_role_permissions" ON role_permissions;
CREATE POLICY "select_role_permissions" ON role_permissions FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_role_permissions" ON role_permissions;
CREATE POLICY "admin_insert_role_permissions" ON role_permissions FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','super_admin'))
);

DROP POLICY IF EXISTS "admin_delete_role_permissions" ON role_permissions;
CREATE POLICY "admin_delete_role_permissions" ON role_permissions FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','super_admin'))
);

-- 4. Seed default system roles
INSERT INTO custom_roles (name, label, color, description, is_system, sort_order) VALUES
  ('super_admin', 'Super Admin',  '#EF4444', 'Acceso total al sistema', true, 1),
  ('admin',       'Administrador','#F97316', 'Gestión completa', true, 2),
  ('inspector',   'Inspector',    '#3B82F6', 'Auditoría', true, 3),
  ('support',     'Soporte',      '#8B5CF6', 'Atención al cliente', true, 4),
  ('user',        'Usuario',      '#22C55E', 'Acceso estándar', true, 5)
ON CONFLICT (name) DO UPDATE SET
  label = EXCLUDED.label, color = EXCLUDED.color,
  description = EXCLUDED.description, updated_at = now();

-- 5. Seed permissions
INSERT INTO role_permissions (role_name, permission) VALUES
  ('super_admin','manage_users'),('super_admin','manage_roles'),
  ('super_admin','manage_products'),('super_admin','manage_orders'),
  ('super_admin','manage_commissions'),('super_admin','manage_config'),
  ('super_admin','view_reports'),
  ('admin','manage_users'),('admin','manage_products'),
  ('admin','manage_orders'),('admin','manage_commissions'),('admin','view_reports'),
  ('inspector','view_users'),('inspector','view_reports'),
  ('support','view_users'),('support','manage_orders'),
  ('user','view_own_profile')
ON CONFLICT (role_name, permission) DO NOTHING;
