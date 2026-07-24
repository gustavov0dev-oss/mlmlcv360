/*
# Security Hardening - Supplementary: revoke EXECUTE on update_updated_at_column

## Summary
update_updated_at_column es una funcion trigger interna (usada en storage.objects
y system_config). Al igual que las otras 4 funciones trigger de la migracion
anterior, no debe ser invocable como RPC desde el frontend. Se revoca EXECUTE
de anon y authenticated.
*/

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated;
