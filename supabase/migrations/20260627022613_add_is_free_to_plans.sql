-- Add is_free column to plans table
ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_free boolean DEFAULT false;

-- Mark existing free plan if slug is 'free' or price is 0
UPDATE plans SET is_free = true WHERE slug = 'free' OR price = 0;

-- Add comment
COMMENT ON COLUMN plans.is_free IS 'If true, this plan is free and does not require payment';
