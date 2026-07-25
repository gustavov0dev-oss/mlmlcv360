/*
# Auto-disable maintenance mode when countdown expires

## Purpose
When maintenance mode is active AND the countdown timer is enabled,
the maintenance page should automatically disappear once the countdown
reaches zero, revealing the normal site content again.

Currently the auto-disable logic lives only in the React frontend
(`MaintenanceAutoDisable` component). That approach has two problems:
  1. It only runs while a browser tab is open on the site. If nobody
     is viewing the maintenance page at the moment the countdown hits
     zero, the site stays "under maintenance" indefinitely for all
     visitors until an admin manually toggles it off.
  2. It relies on the anon key being allowed to UPDATE system_config,
     which is a privilege escalation risk.

## Changes
1. New SECURITY DEFINER function `auto_disable_maintenance()`:
   - Reads `maintenance_mode`, `maintenance_countdown_enabled`, and
     `maintenance_countdown_date` from system_config.
   - If maintenance is ON, countdown is enabled, and the countdown
     date has already passed (<= now()), sets `maintenance_mode` to
     'false' and returns true.
   - Otherwise returns false (no change).
   - Runs with the service role's privileges via SECURITY DEFINER so
     the anon key can call it safely without gaining direct UPDATE
     access to arbitrary system_config rows.
2. Grants EXECUTE to anon + authenticated so any visitor's browser
   (or an edge function / cron) can trigger the check.
3. Adds a defensive index on system_config(key) to speed up the
   single-row lookups the function performs.

## Security
- The function is SECURITY DEFINER and only ever touches the three
  maintenance_* keys it is responsible for. Callers cannot influence
  which row is updated — the key names are hardcoded inside the
  function body.
- anon/authenticated gain EXECUTE only on this function, not on any
  broader table access.
*/

CREATE OR REPLACE FUNCTION public.auto_disable_maintenance()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode        text;
  v_enabled     text;
  v_date        text;
  v_date_ts     timestamptz;
BEGIN
  SELECT value INTO v_mode
    FROM public.system_config
    WHERE key = 'maintenance_mode'
    LIMIT 1;

  IF v_mode IS NULL OR v_mode <> 'true' THEN
    RETURN false;
  END IF;

  SELECT value INTO v_enabled
    FROM public.system_config
    WHERE key = 'maintenance_countdown_enabled'
    LIMIT 1;

  IF v_enabled IS NULL OR v_enabled <> 'true' THEN
    RETURN false;
  END IF;

  SELECT value INTO v_date
    FROM public.system_config
    WHERE key = 'maintenance_countdown_date'
    LIMIT 1;

  IF v_date IS NULL OR v_date = '' THEN
    RETURN false;
  END IF;

  BEGIN
    v_date_ts := v_date::timestamptz;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;

  IF v_date_ts <= now() THEN
    UPDATE public.system_config
      SET value = 'false', updated_at = now()
      WHERE key = 'maintenance_mode';
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_disable_maintenance() TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_system_config_key
  ON public.system_config (key);
