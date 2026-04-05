-- ============================================
-- CUREVIRTUAL - SUPABASE RLS RECURSION FIX
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Create a "Security Definer" function to check the user's role.
-- This function runs as the database owner, bypassing RLS.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public."UserRole"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public."UserRole";
BEGIN
  -- We query the public."User" table directly without triggering RLS
  SELECT role INTO v_role FROM public."User" WHERE id = auth.uid()::text;
  RETURN v_role;
END;
$$;

-- 2. Drop the recursive policies from the "User" table
DROP POLICY IF EXISTS "Admins can view all users" ON "User";
DROP POLICY IF EXISTS "Support can view all users" ON "User";
DROP POLICY IF EXISTS "Admins can update all users" ON "User";

-- 3. Recreate the policies using our new safe role-check function
CREATE POLICY "Admins can view all users" ON "User" FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('SUPERADMIN','ADMIN'));

CREATE POLICY "Support can view all users" ON "User" FOR SELECT
  TO authenticated
  USING (public.get_my_role() = 'SUPPORT');

CREATE POLICY "Admins can update all users" ON "User" FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('SUPERADMIN','ADMIN'))
  WITH CHECK (public.get_my_role() IN ('SUPERADMIN','ADMIN'));

-- 4. Also fix other tables that had similar recursive role checks
DROP POLICY IF EXISTS "Admins view activity logs" ON "ActivityLog";
CREATE POLICY "Admins view activity logs" ON "ActivityLog"
  FOR SELECT TO authenticated 
  USING (public.get_my_role() IN ('SUPERADMIN','ADMIN'));

DROP POLICY IF EXISTS "Admins view system metrics" ON "systemmetric";
CREATE POLICY "Admins view system metrics" ON "systemmetric"
  FOR SELECT TO authenticated 
  USING (public.get_my_role() IN ('SUPERADMIN','ADMIN'));

-- 5. Final check to ensure RLS is correctly enabled
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "systemmetric" ENABLE ROW LEVEL SECURITY;

-- DONE!
-- Now try to run your tests again.
