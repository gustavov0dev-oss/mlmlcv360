-- Fix auth identities for manually inserted users
-- GoTrue (Supabase Auth) requires an entry in auth.identities for each user
-- to be able to query and authenticate them.

-- Clean up the test signup user
DELETE FROM notifications WHERE user_id = (SELECT id FROM profiles WHERE email = 'testsignup@example.com');
DELETE FROM activity_logs WHERE user_id = (SELECT id FROM profiles WHERE email = 'testsignup@example.com');
DELETE FROM notification_preferences WHERE user_id = (SELECT id FROM profiles WHERE email = 'testsignup@example.com');
DELETE FROM profiles WHERE email = 'testsignup@example.com';
DELETE FROM auth.identities WHERE user_id = (SELECT id FROM auth.users WHERE email = 'testsignup@example.com');
DELETE FROM auth.users WHERE email = 'testsignup@example.com';

-- Create identities for all our demo users (email column is generated, omit it)
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id)
SELECT
  u.id::text as provider_id,
  u.id as user_id,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false
  ) as identity_data,
  'email' as provider,
  now() as last_sign_in_at,
  now() as created_at,
  now() as updated_at,
  uuid_generate_v4() as id
FROM auth.users u
WHERE u.email IN (
  'admin@mlm360.pe', 'inspector@mlm360.pe', 'usuario@mlm360.pe',
  'juan@example.com', 'ana@example.com', 'pedro@example.com',
  'lucia@example.com', 'roberto@example.com', 'carmen@example.com',
  'miguel@example.com'
)
ON CONFLICT DO NOTHING;

-- Update raw_app_meta_data to match GoTrue's expected format
UPDATE auth.users
SET raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'))
WHERE email IN (
  'admin@mlm360.pe', 'inspector@mlm360.pe', 'usuario@mlm360.pe',
  'juan@example.com', 'ana@example.com', 'pedro@example.com',
  'lucia@example.com', 'roberto@example.com', 'carmen@example.com',
  'miguel@example.com'
);
