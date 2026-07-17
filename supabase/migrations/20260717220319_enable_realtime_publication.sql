-- Enable Supabase Realtime for all public tables
-- This fixes the issue where database.subscribe() calls in the frontend
-- were not receiving any events because no tables were in the publication.

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    EXCEPTION WHEN duplicate_object THEN
      -- already in publication, skip
      NULL;
    END;
  END LOOP;
END $$;
