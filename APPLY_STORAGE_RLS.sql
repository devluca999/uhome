-- =============================================================================
-- STORAGE RLS POLICIES - Run this in Supabase SQL Editor AFTER creating buckets via UI
-- =============================================================================

-- =============================================================================
-- DROP EXISTING POLICIES (if any)
-- =============================================================================

DROP POLICY IF EXISTS "Landlords can upload documents to their properties" ON storage.objects;
DROP POLICY IF EXISTS "Landlords can delete documents from their properties" ON storage.objects;
DROP POLICY IF EXISTS "Users can read accessible documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Landlords can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Tenants can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Users can read images" ON storage.objects;

-- =============================================================================
-- DOCUMENTS BUCKET RLS
-- =============================================================================

CREATE POLICY "Landlords can upload documents to their properties"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can delete documents from their properties"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can read accessible documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated' AND
    (
      -- Landlords can read documents from their properties
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM properties WHERE owner_id = auth.uid()
      ) OR
      -- Tenants can read documents from their properties
      (storage.foldername(name))[1] IN (
        SELECT property_id::text FROM tenants WHERE user_id = auth.uid()
      ) OR
      -- Tenants can read documents from their leases
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM leases 
        WHERE tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
      )
    )
  );

-- =============================================================================
-- AVATARS BUCKET RLS
-- =============================================================================

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated'
  );

-- =============================================================================
-- IMAGES BUCKET RLS
-- =============================================================================

CREATE POLICY "Landlords can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
      SELECT property_id::text FROM tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'images' AND
    auth.role() = 'authenticated' AND
    (
      -- Landlords can read images from their properties
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM properties WHERE owner_id = auth.uid()
      ) OR
      -- Tenants can read images from their properties
      (storage.foldername(name))[1] IN (
        SELECT property_id::text FROM tenants WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- DATABASE SCHEMA: Add image_urls to maintenance_requests
-- =============================================================================

ALTER TABLE public.maintenance_requests
ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_image_urls 
ON public.maintenance_requests USING GIN (image_urls);

COMMENT ON COLUMN public.maintenance_requests.image_urls IS 'Array of image URLs uploaded with the maintenance request. Stored as JSONB array of strings.';

-- Done! ✅ All storage policies applied successfully.