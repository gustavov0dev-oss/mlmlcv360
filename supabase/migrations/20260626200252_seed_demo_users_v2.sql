-- ── Seed demo users (10 users) ──
-- Password for ALL demo users: Demo123456!
-- We insert into auth.users first, then manually create profiles since the
-- handle_new_user trigger has an EXCEPTION block that silently swallows errors.

-- Clean up any leftover from previous attempts
DELETE FROM notifications WHERE user_id IN (SELECT id FROM profiles WHERE email LIKE '%@example.com' OR email LIKE '%@mlm360.pe');
DELETE FROM activity_logs WHERE user_id IN (SELECT id FROM profiles WHERE email LIKE '%@example.com' OR email LIKE '%@mlm360.pe');
DELETE FROM commissions WHERE user_id IN (SELECT id FROM profiles WHERE email LIKE '%@example.com' OR email LIKE '%@mlm360.pe');
DELETE FROM notification_preferences WHERE user_id IN (SELECT id FROM profiles WHERE email LIKE '%@example.com' OR email LIKE '%@mlm360.pe');
DELETE FROM profiles WHERE email LIKE '%@example.com' OR email LIKE '%@mlm360.pe';
DELETE FROM auth.users WHERE email LIKE '%@example.com' OR email LIKE '%@mlm360.pe';

-- ── Insert users into auth.users ──
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at, email_change_confirm_status,
  raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at,
  is_sso_user, is_anonymous
) VALUES
(
  '00000000-0000-0000-0000-000000000000', uuid_generate_v4(),
  'authenticated', 'authenticated', 'admin@mlm360.pe',
  crypt('Demo123456!', gen_salt('bf')), now(), 0,
  jsonb_build_object('username', 'gustavo_admin', 'full_name', 'Gustavo Ortiz', 'plan', 'elite'),
  '{}', now(), now(), false, false
),
(
  '00000000-0000-0000-0000-000000000000', uuid_generate_v4(),
  'authenticated', 'authenticated', 'inspector@mlm360.pe',
  crypt('Demo123456!', gen_salt('bf')), now(), 0,
  jsonb_build_object('username', 'inspector_demo', 'full_name', 'Carlos Inspector', 'plan', 'pro'),
  '{}', now(), now(), false, false
),
(
  '00000000-0000-0000-0000-000000000000', uuid_generate_v4(),
  'authenticated', 'authenticated', 'usuario@mlm360.pe',
  crypt('Demo123456!', gen_salt('bf')), now(), 0,
  jsonb_build_object('username', 'usuario_demo', 'full_name', 'Maria Gonzalez', 'plan', 'pro'),
  '{}', now(), now(), false, false
),
(
  '00000000-0000-0000-0000-000000000000', uuid_generate_v4(),
  'authenticated', 'authenticated', 'juan@example.com',
  crypt('Demo123456!', gen_salt('bf')), now(), 0,
  jsonb_build_object('username', 'juan_perez', 'full_name', 'Juan Perez', 'plan', 'inicio'),
  '{}', now(), now(), false, false
),
(
  '00000000-0000-0000-0000-000000000000', uuid_generate_v4(),
  'authenticated', 'authenticated', 'ana@example.com',
  crypt('Demo123456!', gen_salt('bf')), now(), 0,
  jsonb_build_object('username', 'ana_lopez', 'full_name', 'Ana Lopez', 'plan', 'inicio'),
  '{}', now(), now(), false, false
),
(
  '00000000-0000-0000-0000-000000000000', uuid_generate_v4(),
  'authenticated', 'authenticated', 'pedro@example.com',
  crypt('Demo123456!', gen_salt('bf')), now(), 0,
  jsonb_build_object('username', 'pedro_garcia', 'full_name', 'Pedro Garcia', 'plan', 'pro'),
  '{}', now(), now(), false, false
),
(
  '00000000-0000-0000-0000-000000000000', uuid_generate_v4(),
  'authenticated', 'authenticated', 'lucia@example.com',
  crypt('Demo123456!', gen_salt('bf')), now(), 0,
  jsonb_build_object('username', 'lucia_torres', 'full_name', 'Lucia Torres', 'plan', 'pro'),
  '{}', now(), now(), false, false
),
(
  '00000000-0000-0000-0000-000000000000', uuid_generate_v4(),
  'authenticated', 'authenticated', 'roberto@example.com',
  crypt('Demo123456!', gen_salt('bf')), now(), 0,
  jsonb_build_object('username', 'roberto_silva', 'full_name', 'Roberto Silva', 'plan', 'elite'),
  '{}', now(), now(), false, false
),
(
  '00000000-0000-0000-0000-000000000000', uuid_generate_v4(),
  'authenticated', 'authenticated', 'carmen@example.com',
  crypt('Demo123456!', gen_salt('bf')), now(), 0,
  jsonb_build_object('username', 'carmen_ruiz', 'full_name', 'Carmen Ruiz', 'plan', 'inicio'),
  '{}', now(), now(), false, false
),
(
  '00000000-0000-0000-0000-000000000000', uuid_generate_v4(),
  'authenticated', 'authenticated', 'miguel@example.com',
  crypt('Demo123456!', gen_salt('bf')), now(), 0,
  jsonb_build_object('username', 'miguel_flores', 'full_name', 'Miguel Flores', 'plan', 'elite'),
  '{}', now(), now(), false, false
);

-- ── Manually create profiles (trigger may have failed silently) ──
-- Use ON CONFLICT to avoid duplicates if trigger did fire

-- 1. Gustavo Ortiz — super_admin, diamond, elite (ROOT)
INSERT INTO profiles (id, email, username, full_name, role, status, rank, plan, referral_code, phone, email_confirmed, force_password_change)
SELECT id, email, 'gustavo_admin', 'Gustavo Ortiz', 'super_admin', 'active', 'diamond', 'elite',
  'GUST001', '987654321', true, false
FROM auth.users WHERE email = 'admin@mlm360.pe'
ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin', status = 'active', rank = 'diamond', plan = 'elite',
  phone = '987654321', email_confirmed = true, force_password_change = false;

-- 2. Carlos Inspector — inspector, platinum, pro
INSERT INTO profiles (id, email, username, full_name, role, status, rank, plan, referral_code, email_confirmed, force_password_change)
SELECT id, email, 'inspector_demo', 'Carlos Inspector', 'inspector', 'active', 'platinum', 'pro',
  'INSP001', true, false
FROM auth.users WHERE email = 'inspector@mlm360.pe'
ON CONFLICT (id) DO UPDATE SET
  role = 'inspector', status = 'active', rank = 'platinum', plan = 'pro',
  email_confirmed = true, force_password_change = false;

-- 3. Maria Gonzalez — user, gold, pro (sponsored by Gustavo, LEFT)
INSERT INTO profiles (id, email, username, full_name, role, status, rank, plan, referral_code, sponsor_id, binary_position, email_confirmed, force_password_change)
SELECT u.id, u.email, 'usuario_demo', 'Maria Gonzalez', 'user', 'active', 'gold', 'pro',
  'USUA001', p.id, 'left', true, false
FROM auth.users u, profiles p
WHERE u.email = 'usuario@mlm360.pe' AND p.email = 'admin@mlm360.pe'
ON CONFLICT (id) DO UPDATE SET
  role = 'user', status = 'active', rank = 'gold', plan = 'pro',
  sponsor_id = (SELECT id FROM profiles WHERE email = 'admin@mlm360.pe'),
  binary_position = 'left', email_confirmed = true, force_password_change = false;

-- 4. Juan Perez — user, silver, inicio (sponsored by Maria, LEFT)
INSERT INTO profiles (id, email, username, full_name, role, status, rank, plan, referral_code, sponsor_id, binary_position, email_confirmed, force_password_change)
SELECT u.id, u.email, 'juan_perez', 'Juan Perez', 'user', 'active', 'silver', 'inicio',
  'JUAN001', p.id, 'left', true, false
FROM auth.users u, profiles p
WHERE u.email = 'juan@example.com' AND p.email = 'usuario@mlm360.pe'
ON CONFLICT (id) DO UPDATE SET
  role = 'user', status = 'active', rank = 'silver', plan = 'inicio',
  sponsor_id = (SELECT id FROM profiles WHERE email = 'usuario@mlm360.pe'),
  binary_position = 'left', email_confirmed = true, force_password_change = false;

-- 5. Ana Lopez — user, bronze, inicio (sponsored by Maria, RIGHT) — SUSPENDED
INSERT INTO profiles (id, email, username, full_name, role, status, rank, plan, referral_code, sponsor_id, binary_position, email_confirmed, force_password_change)
SELECT u.id, u.email, 'ana_lopez', 'Ana Lopez', 'user', 'suspended', 'bronze', 'inicio',
  'ANAL001', p.id, 'right', true, false
FROM auth.users u, profiles p
WHERE u.email = 'ana@example.com' AND p.email = 'usuario@mlm360.pe'
ON CONFLICT (id) DO UPDATE SET
  role = 'user', status = 'suspended', rank = 'bronze', plan = 'inicio',
  sponsor_id = (SELECT id FROM profiles WHERE email = 'usuario@mlm360.pe'),
  binary_position = 'right', email_confirmed = true, force_password_change = false;

-- 6. Pedro Garcia — user, gold, pro (sponsored by Gustavo, RIGHT)
INSERT INTO profiles (id, email, username, full_name, role, status, rank, plan, referral_code, sponsor_id, binary_position, email_confirmed, force_password_change)
SELECT u.id, u.email, 'pedro_garcia', 'Pedro Garcia', 'user', 'active', 'gold', 'pro',
  'PEDR001', p.id, 'right', true, false
FROM auth.users u, profiles p
WHERE u.email = 'pedro@example.com' AND p.email = 'admin@mlm360.pe'
ON CONFLICT (id) DO UPDATE SET
  role = 'user', status = 'active', rank = 'gold', plan = 'pro',
  sponsor_id = (SELECT id FROM profiles WHERE email = 'admin@mlm360.pe'),
  binary_position = 'right', email_confirmed = true, force_password_change = false;

-- 7. Lucia Torres — support, silver, pro (sponsored by Pedro, LEFT)
INSERT INTO profiles (id, email, username, full_name, role, status, rank, plan, referral_code, sponsor_id, binary_position, email_confirmed, force_password_change)
SELECT u.id, u.email, 'lucia_torres', 'Lucia Torres', 'support', 'active', 'silver', 'pro',
  'LUCI001', p.id, 'left', true, false
FROM auth.users u, profiles p
WHERE u.email = 'lucia@example.com' AND p.email = 'pedro@example.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'support', status = 'active', rank = 'silver', plan = 'pro',
  sponsor_id = (SELECT id FROM profiles WHERE email = 'pedro@example.com'),
  binary_position = 'left', email_confirmed = true, force_password_change = false;

-- 8. Roberto Silva — user, platinum, elite (sponsored by Pedro, RIGHT)
INSERT INTO profiles (id, email, username, full_name, role, status, rank, plan, referral_code, sponsor_id, binary_position, email_confirmed, force_password_change)
SELECT u.id, u.email, 'roberto_silva', 'Roberto Silva', 'user', 'active', 'platinum', 'elite',
  'ROBE001', p.id, 'right', true, false
FROM auth.users u, profiles p
WHERE u.email = 'roberto@example.com' AND p.email = 'pedro@example.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'user', status = 'active', rank = 'platinum', plan = 'elite',
  sponsor_id = (SELECT id FROM profiles WHERE email = 'pedro@example.com'),
  binary_position = 'right', email_confirmed = true, force_password_change = false;

-- 9. Carmen Ruiz — user, bronze, inicio (sponsored by Maria, LEFT) — PENDING
INSERT INTO profiles (id, email, username, full_name, role, status, rank, plan, referral_code, sponsor_id, binary_position, email_confirmed, force_password_change)
SELECT u.id, u.email, 'carmen_ruiz', 'Carmen Ruiz', 'user', 'pending', 'bronze', 'inicio',
  'CARM001', p.id, 'left', true, false
FROM auth.users u, profiles p
WHERE u.email = 'carmen@example.com' AND p.email = 'usuario@mlm360.pe'
ON CONFLICT (id) DO UPDATE SET
  role = 'user', status = 'pending', rank = 'bronze', plan = 'inicio',
  sponsor_id = (SELECT id FROM profiles WHERE email = 'usuario@mlm360.pe'),
  binary_position = 'left', email_confirmed = true, force_password_change = false;

-- 10. Miguel Flores — admin, crown, elite
INSERT INTO profiles (id, email, username, full_name, role, status, rank, plan, referral_code, email_confirmed, force_password_change)
SELECT id, email, 'miguel_flores', 'Miguel Flores', 'admin', 'active', 'crown', 'elite',
  'MIGU001', true, false
FROM auth.users WHERE email = 'miguel@example.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin', status = 'active', rank = 'crown', plan = 'elite',
  email_confirmed = true, force_password_change = false;

-- ── Seed sample commissions for the admin user ──
INSERT INTO commissions (user_id, from_user_id, type, amount, status, description, created_at)
SELECT p1.id, p2.id, 'direct', 320.50, 'paid', 'Comisión directa por venta', now() - interval '5 days'
FROM profiles p1, profiles p2
WHERE p1.email = 'admin@mlm360.pe' AND p2.email = 'usuario@mlm360.pe';

INSERT INTO commissions (user_id, from_user_id, type, amount, status, description, created_at)
SELECT p1.id, p2.id, 'binary', 120.50, 'pending', 'Comisión binaria semanal', now() - interval '2 days'
FROM profiles p1, profiles p2
WHERE p1.email = 'admin@mlm360.pe' AND p2.email = 'pedro@example.com';

INSERT INTO commissions (user_id, from_user_id, type, amount, status, description, created_at)
SELECT p1.id, p2.id, 'rank_bonus', 5000.00, 'approved', 'Bono por rango Diamante', now() - interval '1 days'
FROM profiles p1, profiles p2
WHERE p1.email = 'admin@mlm360.pe' AND p2.email = 'roberto@example.com';

-- ── Seed sample activity logs ──
INSERT INTO activity_logs (user_id, action, description, created_at)
SELECT id, 'Nueva afiliación', 'Maria Gonzalez se unió a tu red', now() - interval '2 hours'
FROM profiles WHERE email = 'admin@mlm360.pe';

INSERT INTO activity_logs (user_id, action, description, created_at)
SELECT id, 'Comisión acreditada', 'Se acreditó S/ 320.50', now() - interval '1 hour'
FROM profiles WHERE email = 'admin@mlm360.pe';

INSERT INTO activity_logs (user_id, action, description, created_at)
SELECT id, 'Bono desbloqueado', 'Has desbloqueado el bono de liderazgo', now() - interval '3 hours'
FROM profiles WHERE email = 'admin@mlm360.pe';

-- ── Seed sample notifications ──
INSERT INTO notifications (user_id, title, message, type, read, created_at)
SELECT id, 'Nuevo afiliado registrado', 'Maria Gonzalez se unió a tu red', 'success', false, now() - interval '2 hours'
FROM profiles WHERE email = 'admin@mlm360.pe';

INSERT INTO notifications (user_id, title, message, type, read, created_at)
SELECT id, 'Comisión acreditada', 'Se acreditó tu comisión de S/ 320.50', 'success', false, now() - interval '1 hour'
FROM profiles WHERE email = 'admin@mlm360.pe';

INSERT INTO notifications (user_id, title, message, type, read, created_at)
SELECT id, 'Bono desbloqueado', 'Has desbloqueado el bono de liderazgo', 'info', false, now() - interval '5 hours'
FROM profiles WHERE email = 'admin@mlm360.pe';

INSERT INTO notifications (user_id, title, message, type, read, created_at)
SELECT id, 'Mantenimiento programado', 'Sistema en mantenimiento el domingo a las 2am', 'warning', true, now() - interval '2 days'
FROM profiles WHERE email = 'admin@mlm360.pe';

INSERT INTO notifications (user_id, title, message, type, read, created_at)
SELECT id, 'Nuevo rango disponible', 'Estás cerca de alcanzar el rango Corona', 'info', true, now() - interval '3 days'
FROM profiles WHERE email = 'admin@mlm360.pe';

-- ── Seed notification preferences for all users ──
INSERT INTO notification_preferences (user_id, new_affiliates, commissions, rank_changes, weekly_reports, system_alerts, promotions)
SELECT id, true, true, true, false, true, false FROM profiles
ON CONFLICT (user_id) DO NOTHING;
