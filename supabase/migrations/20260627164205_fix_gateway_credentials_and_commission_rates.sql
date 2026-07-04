-- Fix PayPal credentials: remove webhook_id, keep client_id + client_secret
UPDATE payment_gateways 
SET credentials = '{"client_id": "", "client_secret": ""}'::jsonb
WHERE slug = 'paypal';

-- Fix Culqi credentials: public_key + private_key + (optional rsa_key remove)
UPDATE payment_gateways 
SET credentials = '{"public_key": "", "private_key": ""}'::jsonb
WHERE slug = 'culqi';

-- Fix Niubiz
UPDATE payment_gateways 
SET credentials = '{"access_key": "", "secret_key": "", "merchant_id": ""}'::jsonb
WHERE slug = 'niubiz';

-- Fix MercadoPago
UPDATE payment_gateways 
SET credentials = '{"public_key": "", "access_token": ""}'::jsonb
WHERE slug = 'mercadopago';

-- Fix Izipay
UPDATE payment_gateways 
SET credentials = '{"merchant_code": "", "public_key": "", "private_key": ""}'::jsonb
WHERE slug = 'izipay';

-- Fix Yape
UPDATE payment_gateways 
SET credentials = '{"phone_number": "", "merchant_name": ""}'::jsonb
WHERE slug = 'yape';

-- Add commission_rate column to payment_gateways (percentage fee per transaction)
ALTER TABLE payment_gateways ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2) DEFAULT 0;

-- Set typical commission rates per gateway
UPDATE payment_gateways SET commission_rate = 3.49 WHERE slug = 'paypal';
UPDATE payment_gateways SET commission_rate = 2.75 WHERE slug = 'culqi';
UPDATE payment_gateways SET commission_rate = 2.50 WHERE slug = 'niubiz';
UPDATE payment_gateways SET commission_rate = 2.99 WHERE slug = 'mercadopago';
UPDATE payment_gateways SET commission_rate = 2.50 WHERE slug = 'izipay';
UPDATE payment_gateways SET commission_rate = 0.00 WHERE slug = 'yape';
