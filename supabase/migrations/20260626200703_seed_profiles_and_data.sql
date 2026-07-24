-- Create profiles for all 10 users (trigger failed silently, so we do it manually)
-- Then update with correct roles, ranks, plans, and sponsor relationships.

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
