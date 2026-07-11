-- Public lookup of a complaint by its correlativo code.
-- Security definer bypasses RLS; the function returns only the single row
-- matching the provided code, so no enumeration is possible.
-- Sensitive PII (num_doc, email, telefono, direccion) is NOT exposed.

CREATE OR REPLACE FUNCTION public.get_complaint_by_code(p_code text)
RETURNS TABLE (
  correlativo text,
  tipo text,
  nombre text,
  apellido text,
  status text,
  created_at timestamptz,
  respuesta text,
  fecha_respuesta timestamptz,
  detalle text,
  descripcion_bien text,
  tipo_bien text,
  monto numeric,
  moneda text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.correlativo, c.tipo, c.nombre, c.apellido, c.status,
    c.created_at, c.respuesta, c.fecha_respuesta,
    c.detalle, c.descripcion_bien, c.tipo_bien, c.monto, c.moneda
  FROM public.complaints_book c
  WHERE c.correlativo = p_code;
$$;

-- Revoke default privileges, then grant execute to anon + authenticated
-- so the public form (anon key) and logged-in users can both call it.
REVOKE EXECUTE ON FUNCTION public.get_complaint_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_complaint_by_code(text) TO anon, authenticated;
