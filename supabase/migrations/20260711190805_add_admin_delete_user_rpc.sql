/*
# Add admin_delete_user RPC function

1. Purpose
   - Allows an admin to fully delete a user: both the auth.users record and the profiles record.
   - The frontend's anon-key client cannot call auth.admin.deleteUser() directly, so this RPC wraps it.

2. Security
   - SECURITY DEFINER function that runs with elevated privileges.
   - Only callable by authenticated users who have an admin role in their profile.
   - Uses pgcrypto for gen_random_uuid() if needed.

3. Notes
   - Deletes the auth.users record first (cascades to profiles via FK).
   - If the profile has no auth user, falls back to deleting the profile directly.
*/

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Solo los administradores pueden eliminar usuarios';
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

-- Grant execute to authenticated users (the function itself checks admin role)
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;