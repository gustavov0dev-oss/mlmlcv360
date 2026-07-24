/*
# Security Hardening - Revoke PUBLIC EXECUTE on SECURITY DEFINER functions

## Summary
Completa la causa raiz que quedo a medias en la migracion anterior.
Postgres otorga EXECUTE a PUBLIC por defecto al crear (o re-crear con
CREATE OR REPLACE) una funcion. La migracion anterior revoco EXECUTE de
anon y authenticated, pero el permiso de PUBLIC seguia vigente por debajo,
por lo que anon/authenticated heredaban el acceso igual.

## Cambios
1. REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC para las 10 funciones
   SECURITY DEFINER.
2. GRANT EXECUTE TO authenticated solo para las 5 funciones que el
   frontend llama como RPC:
   - place_order (con validacion auth.uid() = p_user_id interna)
   - mark_notification_read (con validacion propietario auth.uid())
   - mark_all_notifications_read (con validacion p_user_id = auth.uid())
   - assign_existing_user_to_network (con validacion get_my_role() admin)
   - move_user_in_network (con validacion get_my_role() admin)
3. Las 5 funciones de trigger interno NO reciben GRANT a ningun rol de
   usuario — se ejecutan solo internamente como el owner (postgres):
   - update_product_rating_stats
   - update_updated_at_column
   - update_updated_at
   - rls_auto_enable
   - handle_new_user
*/

-- ============================================================
-- 1. Revocar EXECUTE de PUBLIC en las 10 funciones
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.place_order(uuid, jsonb, jsonb, jsonb, text, numeric, text, text, numeric, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_existing_user_to_network(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_user_in_network(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_product_rating_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_notification_read(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read(uuid) FROM PUBLIC;

-- ============================================================
-- 2. Otorgar EXECUTE solo a authenticated en las 5 funciones RPC
-- ============================================================

GRANT EXECUTE ON FUNCTION public.place_order(uuid, jsonb, jsonb, jsonb, text, numeric, text, text, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_existing_user_to_network(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_user_in_network(uuid, uuid, text) TO authenticated;

-- ============================================================
-- 3. Funciones de trigger interno: sin GRANT a roles de usuario
-- (update_product_rating_stats, update_updated_at_column,
--  update_updated_at, rls_auto_enable, handle_new_user)
-- El owner (postgres) puede ejecutarlas internamente sin GRANT.
-- ============================================================
