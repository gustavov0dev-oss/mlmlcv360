/*
# Fix complaint correlativo trigger + add company_tagline config

1. Fix: the original trigger used pg_get_serial_sequence on a UUID column (no serial) -> nextval returned NULL -> correlativo was NULL.
   Replace with a simpler approach: use a SEQUENCE object.
2. Add company_tagline to system_config seed.
*/

-- Create a dedicated sequence for complaint correlativos
CREATE SEQUENCE IF NOT EXISTS complaints_book_seq START 1;

-- Replace the trigger function
CREATE OR REPLACE FUNCTION generate_complaint_correlativo()
RETURNS trigger AS $$
DECLARE
  seq_val integer;
BEGIN
  IF NEW.correlativo IS NULL THEN
    seq_val := nextval('complaints_book_seq');
    NEW.correlativo := 'REC-' || to_char(now(), 'YYYY') || '-' || lpad(seq_val::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed company_tagline
INSERT INTO system_config (key, value)
VALUES ('company_tagline', 'Plataforma empresarial para gestión de redes y comercio. Impulsa tu negocio al siguiente nivel.')
ON CONFLICT (key) DO NOTHING;
