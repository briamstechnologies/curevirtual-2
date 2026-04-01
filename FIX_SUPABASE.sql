-- 1. Ensure `nic` is completely gone.
ALTER TABLE IF EXISTS public."User" DROP COLUMN IF EXISTS nic CASCADE;

-- 2. Ensure all ENUMS have proper values.
DO $$ BEGIN
  ALTER TYPE public."UserRole" ADD VALUE IF NOT EXISTS 'SUPERADMIN';
  ALTER TYPE public."UserRole" ADD VALUE IF NOT EXISTS 'ADMIN';
  ALTER TYPE public."UserRole" ADD VALUE IF NOT EXISTS 'SUPPORT';
  ALTER TYPE public."UserRole" ADD VALUE IF NOT EXISTS 'PHARMACY';
  ALTER TYPE public."UserRole" ADD VALUE IF NOT EXISTS 'DOCTOR';
  ALTER TYPE public."UserRole" ADD VALUE IF NOT EXISTS 'PATIENT';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public."Gender" ADD VALUE IF NOT EXISTS 'MALE';
  ALTER TYPE public."Gender" ADD VALUE IF NOT EXISTS 'FEMALE';
  ALTER TYPE public."Gender" ADD VALUE IF NOT EXISTS 'OTHER';
  ALTER TYPE public."Gender" ADD VALUE IF NOT EXISTS 'PREFER_NOT_TO_SAY';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 3. The bulletproof trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_role public."UserRole";
  v_gender public."Gender";
  v_dob timestamp;
BEGIN
  -- Safe parsing for ENUMs to avoid cast exceptions crashing the trigger
  BEGIN
    v_role := COALESCE(NULLIF(new.raw_user_meta_data->>'role', ''), 'PATIENT')::public."UserRole";
  EXCEPTION WHEN OTHERS THEN
    v_role := 'PATIENT';
  END;

  BEGIN
    v_gender := COALESCE(NULLIF(new.raw_user_meta_data->>'gender', ''), 'PREFER_NOT_TO_SAY')::public."Gender";
  EXCEPTION WHEN OTHERS THEN
    v_gender := 'PREFER_NOT_TO_SAY';
  END;

  BEGIN
    v_dob := COALESCE(NULLIF(new.raw_user_meta_data->>'dateOfBirth', '')::timestamp, NOW());
  EXCEPTION WHEN OTHERS THEN
    v_dob := NOW();
  END;

  -- Cleanup orphan users if there's an email conflict
  -- (When auth.users deleted via dashboard but public."User" remained)
  DELETE FROM public."User" 
  WHERE email = new.email 
    AND id != new.id 
    AND NOT EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = public."User".id);

  -- Perform the insert
  INSERT INTO public."User" (id, email, "firstName", "lastName", role, "updatedAt", "dateOfBirth", gender)
  VALUES (
    new.id,
    new.email,
    COALESCE(NULLIF(new.raw_user_meta_data->>'firstName', ''), 'Unknown'),
    COALESCE(NULLIF(new.raw_user_meta_data->>'lastName', ''), 'Unknown'),
    v_role,
    NOW(),
    v_dob,
    v_gender
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    "firstName" = EXCLUDED."firstName",
    "lastName" = EXCLUDED."lastName",
    role = EXCLUDED.role;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Last resort catch-all to ensure the user gets registered in Supabase
  -- even if the public."User" profile fails.
  RAISE LOG 'Critical error in handle_new_user for %: %', new.email, SQLERRM;
  RETURN new;
END;
$func$;

-- 4. recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
