ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS bg_color TEXT;

-- Set sensible defaults for existing plans based on common MLM plan conventions
UPDATE plans SET
  icon = CASE 
    WHEN slug ILIKE '%elite%' OR slug ILIKE '%premium%' OR slug ILIKE '%gold%' THEN 'crown'
    WHEN slug ILIKE '%free%' OR slug ILIKE '%basico%' OR slug ILIKE '%basic%' THEN 'star'
    ELSE 'zap'
  END,
  color = CASE 
    WHEN slug ILIKE '%elite%' OR slug ILIKE '%premium%' OR slug ILIKE '%gold%' THEN 'text-amber-600'
    WHEN slug ILIKE '%free%' OR slug ILIKE '%basico%' OR slug ILIKE '%basic%' THEN 'text-slate-600'
    ELSE 'text-blue-600'
  END,
  bg_color = CASE 
    WHEN slug ILIKE '%elite%' OR slug ILIKE '%premium%' OR slug ILIKE '%gold%' THEN 'bg-amber-500/10'
    WHEN slug ILIKE '%free%' OR slug ILIKE '%basico%' OR slug ILIKE '%basic%' THEN 'bg-slate-500/10'
    ELSE 'bg-blue-500/10'
  END
WHERE icon IS NULL;