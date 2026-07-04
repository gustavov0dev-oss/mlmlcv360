-- Clean up all manually inserted users and their data
-- We'll recreate them via the Supabase Auth API (signup endpoint)

DELETE FROM notifications;
DELETE FROM activity_logs;
DELETE FROM commissions;
DELETE FROM notification_preferences;
DELETE FROM profiles;
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users);
DELETE FROM auth.users;
