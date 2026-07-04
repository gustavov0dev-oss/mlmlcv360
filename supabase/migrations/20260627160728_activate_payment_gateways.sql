-- Activate all payment gateways so they appear in the payment page
UPDATE payment_gateways SET is_active = true;

-- Add izipay gateway (popular in Peru)
INSERT INTO payment_gateways (slug, name, logo, currency, is_active, credentials, test_mode, description)
VALUES (
  'izipay', 'Izipay', '💳', 'PEN', true,
  '{"public_key": "", "private_key": "", "merchant_code": ""}',
  true,
  'Pasarela peruana. Acepta Visa, Mastercard, Amex y billeteras digitales.'
)
ON CONFLICT (slug) DO UPDATE SET is_active = true;

-- Add Yape/Plin gateway
INSERT INTO payment_gateways (slug, name, logo, currency, is_active, credentials, test_mode, description)
VALUES (
  'yape', 'Yape / Plin', '📱', 'PEN', true,
  '{"phone_number": "", "merchant_name": ""}',
  true,
  'Pago por transferencia Yape o Plin. Confirmación manual por el administrador.'
)
ON CONFLICT (slug) DO UPDATE SET is_active = true;
