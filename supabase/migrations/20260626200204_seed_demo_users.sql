-- ── Seed demo users ──
-- Creates 10 demo users in auth.users. The handle_new_user trigger fires
-- AFTER INSERT on auth.users and creates the corresponding profiles row.
-- Password for ALL demo users: Demo123456!

INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at, email_change_confirm_status,
  raw_user_meta_data, created_at, updated_at, last_sign_in_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, phone, phone_confirmed_at, banned_until, email_change_token_current
) VALUES
(
  '00000000-0000-0000-0000-000000000000', uuid_generate_v4(),
  'authenticated', 'authenticated', 'admin@mlm360.pe',
  crypt('Demo123456!', gen_salt('bf')), now(), 0,
  jsonb_build_object('username', 'gustavo_admin', 'full_name', 'Gustavo Ortiz', 'plan', 'elite', 'role', 'super_admin'),
  now(), now(), NULL, '', '', '', '',
  '{}', NULL, NULL, NULL, ''
),
(
  '00000000-0000-0000-0000-000000000000', uuid_generate_v4(),
  'authenticated', 'authenticated', 'inspector@mlm360.pe',
  crypt('Demo123456!', gen_salt('bf')), now(), 0,
  jsonb_build_object('username', 'inspector_demo', 'full_name', 'Carlos Inspector', 'plan', 'pro', 'role', 'inspector'),
  now(), now(), NULL, '', '', '', '',
  '{}', NULL, NULL, NULL, ''
),
(
  '00000000-0000-0000-0000-000000000000', uuid_generate_v4(),
  'authenticated', 'authenticated', 'usuario@mlm360.pe',
  crypt('Demo123456!', gen_salt('bf')), now(), 0,
  jsonb_build_object('username', 'usuario_demo', 'full_name', 'Maria Gonzalez', 'plan', 'pro', 'role', 'user'),
  now(), now(), NULL, '', '', '', '',
  '{}', NULL, NULL, NULL, ''
),
(
  '00000000-0000-0000-0000-000000000000', uuid_generate_v4(),
  'authenticated', 'authenticated', 'juan@example.com',
  crypt('Demo123456!', gen_salt('bf')), now(), 0,
  jsonb_build_object('username', 'juan_perez', 'full_name', 'Juan Perez', 'plan', 'inicio', 'role', 'user'),
  now(), now(), NULL, '', '', '', '',
  '{}', NULL, NULL, NULL, ''
),
(
  '00000000-0000-0000-0000-000000000000', uuid_generate_v4(),
  'authenticated', 'authenticated', 'ana@example.com',
  crypt('Demo123456!', gen_salt('bf')), now(), 0,
  jsonb_build_object('username', 'ana_lopez', 'full_name', 'Ana Lopez', 'plan', 'inicio', 'role', 'user'),
  now(), now(), NULL, '', '', '', '',
  '{}', NULL, NULL, NULL, ''
),
(
  '00000000-0000-0000-0000-000000000000', uuid_generate_v4(),
  'authenticated', 'authenticated', 'pedro@example.com',
  crypt('Demo123456!', gen_salt('bf')), now(), 0,
  jsonb_build_object('username', 'pedro_garcia', 'full_name', 'Pedro Garcia', 'plan', 'pro', 'role', 'user'),
  now(), now(), NULL, '', '', '', '',
  '{}', NULL, NULL, NULL, ''
),
(
  '00000000-0000-0000-0000-000000000000', uuid_generate_v4(),
  'authenticated', 'authenticated', 'lucia@example.com',
  crypt('Demo123456!', gen_salt('bf')), now(), 0,
  jsonb_build_object('username', 'lucia_torres', 'full_name', 'Lucia Torres', 'plan', 'pro', 'role', 'support'),
  now(), now(), NULL, '', '', '', '',
  '{}', NULL, NULL, NULL, ''
),
(
  '00000000-0000-0000-0000-000000000000', uuid_generate_v4(),
  'authenticated', 'authenticated', 'roberto@example.com',
  crypt('Demo123456!', gen_salt('bf')), now(), 0,
  jsonb_build_object('username', 'roberto_silva', 'full_name', 'Roberto Silva', 'plan', 'elite', 'role', 'user'),
  now(), now(), NULL, '', '', '', '',
  '{}', NULL, NULL, NULL, ''
),
(
  '00000000-0000-0000-0000-000000000000', uuid_generate_v4(),
  'authenticated', 'authenticated', 'carmen@example.com',
  crypt('Demo123456!', gen_salt('bf')), now(), 0,
  jsonb_build_object('username', 'carmen_ruiz', 'full_name', 'Carmen Ruiz', 'plan', 'inicio', 'role', 'user'),
  now(), now(), NULL, '', '', '', '',
  '{}', NULL, NULL, NULL, ''
),
(
  '00000000-0000-0000-0000-000000000000', uuid_generate_v4(),
  'authenticated', 'authenticated', 'miguel@example.com',
  crypt('Demo123456!', gen_salt('bf')), now(), 0,
  jsonb_build_object('username', 'miguel_flores', 'full_name', 'Miguel Flores', 'plan', 'elite', 'role', 'admin'),
  now(), now(), NULL, '', '', '', '',
  '{}', NULL, NULL, NULL, ''
);

-- The trigger created profile rows. Now update them with the correct
-- role, rank, plan, status, and sponsor relationships.

-- 1. Gustavo Ortiz — super_admin, diamond, elite (root)
UPDATE profiles SET
  role = 'super_admin', rank = 'diamond', plan = 'elite', status = 'active',
  phone = '987654321', email_confirmed = true, force_password_change = false
WHERE email = 'admin@mlm360.pe';

-- 2. Carlos Inspector — inspector, platinum, pro
UPDATE profiles SET
  role = 'inspector', rank = 'platinum', plan = 'pro', status = 'active',
  email_confirmed = true, force_password_change = false
WHERE email = 'inspector@mlm360.pe';

-- 3. Maria Gonzalez — user, gold, pro (sponsored by Gustavo, left)
UPDATE profiles SET
  role = 'user', rank = 'gold', plan = 'pro', status = 'active',
  sponsor_id = (SELECT id FROM profiles WHERE email = 'admin@mlm360.pe'),
  binary_position = 'left', email_confirmed = true, force_password_change = false
WHERE email = 'usuario@mlm360.pe';

-- 4. Juan Perez — user, silver, inicio (sponsored by Maria, left)
UPDATE profiles SET
  role = 'user', rank = 'silver', plan = 'inicio', status = 'active',
  sponsor_id = (SELECT id FROM profiles WHERE email = 'usuario@mlm360.pe'),
  binary_position = 'left', email_confirmed = true, force_password_change = false
WHERE email = 'juan@example.com';

-- 5. Ana Lopez — user, bronze, inicio (sponsored by Maria, right) — SUSPENDED
UPDATE profiles SET
  role = 'user', rank = 'bronze', plan = 'inicio', status = 'suspended',
  sponsor_id = (SELECT id FROM profiles WHERE email = 'usuario@mlm360.pe'),
  binary_position = 'right', email_confirmed = true, force_password_change = false
WHERE email = 'ana@example.com';

-- 6. Pedro Garcia — user, gold, pro (sponsored by Gustavo, right)
UPDATE profiles SET
  role = 'user', rank = 'gold', plan = 'pro', status = 'active',
  sponsor_id = (SELECT id FROM profiles WHERE email = 'admin@mlm360.pe'),
  binary_position = 'right', email_confirmed = true, force_password_change = false
WHERE email = 'pedro@example.com';

-- 7. Lucia Torres — support, silver, pro (sponsored by Pedro, left)
UPDATE profiles SET
  role = 'support', rank = 'silver', plan = 'pro', status = 'active',
  sponsor_id = (SELECT id FROM profiles WHERE email = 'pedro@example.com'),
  binary_position = 'left', email_confirmed = true, force_password_change = false
WHERE email = 'lucia@example.com';

-- 8. Roberto Silva — user, platinum, elite (sponsored by Pedro, right)
UPDATE profiles SET
  role = 'user', rank = 'platinum', plan = 'elite', status = 'active',
  sponsor_id = (SELECT id FROM profiles WHERE email = 'pedro@example.com'),
  binary_position = 'right', email_confirmed = true, force_password_change = false
WHERE email = 'roberto@example.com';

-- 9. Carmen Ruiz — user, bronze, inicio (sponsored by Maria, left) — PENDING
UPDATE profiles SET
  role = 'user', rank = 'bronze', plan = 'inicio', status = 'pending',
  sponsor_id = (SELECT id FROM profiles WHERE email = 'usuario@mlm360.pe'),
  binary_position = 'left', email_confirmed = true, force_password_change = false
WHERE email = 'carmen@example.com';

-- 10. Miguel Flores — admin, crown, elite
UPDATE profiles SET
  role = 'admin', rank = 'crown', plan = 'elite', status = 'active',
  email_confirmed = true, force_password_change = false
WHERE email = 'miguel@example.com';

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
