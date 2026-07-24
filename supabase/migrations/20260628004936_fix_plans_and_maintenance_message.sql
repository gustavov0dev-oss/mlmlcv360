-- Fix plans data: 'free' plan should be truly free
UPDATE plans SET is_free = true, price = 0 WHERE slug = 'free';

-- Add maintenance_message key if missing
INSERT INTO system_config(key, value, category) 
VALUES ('maintenance_message', 'Estamos realizando mejoras. Volvemos pronto.', 'general')
ON CONFLICT (key) DO NOTHING;

-- Verify add_referral_direct RPC signature
-- (don't recreate, just check it exists - already confirmed above)

-- Fix: ensure all non-free plans have is_free=false
UPDATE plans SET is_free = false WHERE price > 0;
