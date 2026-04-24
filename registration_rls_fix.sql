-- ============================================================
-- CureVirtual — Registration RLS & Storage Security Patch
-- Run this in: Supabase Dashboard → SQL Editor
-- This script ensures that the backend (service_role) has 
-- full access to registration requests and license documents.
-- ============================================================

-- 1. Ensure Table RLS is correct
ALTER TABLE "RegistrationRequest" ENABLE ROW LEVEL SECURITY;

-- Drop existing to avoid conflicts
DROP POLICY IF EXISTS "service_role_full_access" ON "RegistrationRequest";
DROP POLICY IF EXISTS "admin_select_all" ON "RegistrationRequest";
DROP POLICY IF EXISTS "user_select_own" ON "RegistrationRequest";

-- Allow service_role (backend) full access to RegistrationRequest table
CREATE POLICY "service_role_full_access"
  ON "RegistrationRequest"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users (admins) to see all requests
CREATE POLICY "admin_select_all"
  ON "RegistrationRequest"
  FOR SELECT
  TO authenticated
  USING (true); -- We rely on backend middleware for strict admin checks, 
               -- but this allows the 'authenticated' role (which includes admins) to read.

-- 2. Ensure Storage RLS is correct for 'license-documents' bucket
-- Note: Supabase Storage uses the storage.objects table for RLS.

-- First, ensure the bucket exists and is private
INSERT INTO storage.buckets (id, name, public)
VALUES ('license-documents', 'license-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies for this bucket to ensure a clean state
DROP POLICY IF EXISTS "service_role_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "service_role_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "service_role_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "service_role_storage_delete" ON storage.objects;
DROP POLICY IF EXISTS "user_upload_own_license" ON storage.objects;

-- Policy: Allow service_role to INSERT into license-documents bucket
CREATE POLICY "service_role_storage_insert"
  ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'license-documents');

-- Policy: Allow service_role to SELECT from license-documents bucket
CREATE POLICY "service_role_storage_select"
  ON storage.objects
  FOR SELECT
  TO service_role
  USING (bucket_id = 'license-documents');

-- Policy: Allow service_role to UPDATE (upsert) in license-documents bucket
CREATE POLICY "service_role_storage_update"
  ON storage.objects
  FOR UPDATE
  TO service_role
  USING (bucket_id = 'license-documents')
  WITH CHECK (bucket_id = 'license-documents');

-- Policy: Allow service_role to DELETE from license-documents bucket
CREATE POLICY "service_role_storage_delete"
  ON storage.objects
  FOR DELETE
  TO service_role
  USING (bucket_id = 'license-documents');

-- Optional: Allow authenticated users to upload to their own folder (extra safety)
CREATE POLICY "user_upload_own_license"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'license-documents'
    AND (storage.foldername(name))[1] IN ('doctor', 'pharmacy')
    AND (storage.foldername(name))[2] = auth.uid()::TEXT
  );

-- 3. Grant permissions to service_role on the schema (just in case)
GRANT ALL ON TABLE "RegistrationRequest" TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO service_role;
