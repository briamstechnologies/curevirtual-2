-- ============================================================
-- CureVirtual — Registration Approval Workflow
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── 1. Add approvalStatus column to User table ───────────────
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED';

-- ─── 2. Create RegistrationRequest table ──────────────────────
CREATE TABLE IF NOT EXISTS "RegistrationRequest" (
  "id"              TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "userId"          TEXT        NOT NULL,
  "role"            TEXT        NOT NULL,                 -- 'DOCTOR' | 'PHARMACY'
  "status"          TEXT        NOT NULL DEFAULT 'PENDING', -- PENDING | APPROVED | REJECTED
  "rejectionReason" TEXT,
  "licenseImageUrl" TEXT        NOT NULL,                 -- Signed URL (refreshed on read)
  "licenseFilePath" TEXT        NOT NULL,                 -- Stable storage path
  "submittedData"   JSONB       NOT NULL,                 -- Full form snapshot
  "reviewedBy"      TEXT,                                 -- Admin user ID
  "reviewedAt"      TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "RegistrationRequest_pkey"   PRIMARY KEY ("id"),
  CONSTRAINT "RegistrationRequest_userId_key" UNIQUE ("userId"),
  CONSTRAINT "RegistrationRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- ─── 3. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "RegistrationRequest_status_idx"
  ON "RegistrationRequest" ("status");

CREATE INDEX IF NOT EXISTS "RegistrationRequest_role_idx"
  ON "RegistrationRequest" ("role");

CREATE INDEX IF NOT EXISTS "RegistrationRequest_createdAt_idx"
  ON "RegistrationRequest" ("createdAt" DESC);

-- ─── 4. Auto-update updatedAt on every row change ────────────
CREATE OR REPLACE FUNCTION update_registration_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_registration_request_updated_at ON "RegistrationRequest";
CREATE TRIGGER trg_registration_request_updated_at
  BEFORE UPDATE ON "RegistrationRequest"
  FOR EACH ROW EXECUTE FUNCTION update_registration_request_updated_at();

-- ─── 5. Row Level Security ────────────────────────────────────
ALTER TABLE "RegistrationRequest" ENABLE ROW LEVEL SECURITY;

-- Allow the service role (backend) full access
DROP POLICY IF EXISTS "service_role_full_access" ON "RegistrationRequest";
CREATE POLICY "service_role_full_access"
  ON "RegistrationRequest"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 6. Storage: create license-documents bucket ─────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'license-documents',
  'license-documents',
  false,               -- private bucket
  10485760,            -- 10 MB
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── 7. Storage RLS Policies ─────────────────────────────────
-- Only the service role (backend) can upload/read license docs
-- This keeps documents completely private from public access

-- Allow service_role to upload
DROP POLICY IF EXISTS "service_role_upload" ON storage.objects;
CREATE POLICY "service_role_upload"
  ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'license-documents');

-- Allow service_role to read / generate signed URLs
DROP POLICY IF EXISTS "service_role_read" ON storage.objects;
CREATE POLICY "service_role_read"
  ON storage.objects
  FOR SELECT
  TO service_role
  USING (bucket_id = 'license-documents');

-- Allow service_role to overwrite (upsert)
DROP POLICY IF EXISTS "service_role_update" ON storage.objects;
CREATE POLICY "service_role_update"
  ON storage.objects
  FOR UPDATE
  TO service_role
  USING (bucket_id = 'license-documents');

-- Allow authenticated users to upload ONLY their own file path
-- Path format: doctor/<userId>/license.ext  or  pharmacy/<userId>/license.ext
DROP POLICY IF EXISTS "user_upload_own_license" ON storage.objects;
CREATE POLICY "user_upload_own_license"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'license-documents'
    AND (storage.foldername(name))[2] = auth.uid()::TEXT
  );

-- ─── 8. Verify everything looks correct ──────────────────────
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'RegistrationRequest'
ORDER BY ordinal_position;
