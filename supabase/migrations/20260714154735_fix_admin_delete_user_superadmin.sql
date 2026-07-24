-- Fix: admin_delete_user only checked role = 'admin', excluding super_admin users.
-- Now accepts both admin and super_admin roles.

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Check if caller is admin or super_admin
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Solo los administradores pueden eliminar usuarios';
  END IF;

  -- Prevent self-deletion
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes eliminar tu propia cuenta';
  END IF;

  -- Delete from auth.users (cascades to profiles)
  DELETE FROM auth.users WHERE id = p_user_id;

  -- If auth user didn't exist, try deleting profile directly
  IF NOT FOUND THEN
    DELETE FROM public.profiles WHERE id = p_user_id;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
