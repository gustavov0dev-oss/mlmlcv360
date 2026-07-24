-- Public RPC to get platform stats (affiliate count, product count) without RLS blocking anon users
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_affiliates', (SELECT count(*)::int FROM public.profiles WHERE id IS NOT NULL),
    'total_products', (SELECT count(*)::int FROM public.products WHERE status = 'active')
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO anon, authenticated;
