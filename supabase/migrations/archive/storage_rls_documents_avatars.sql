-- RLS policies for documents and avatars storage buckets
-- Run this in Supabase SQL Editor

-- ============================================================================
-- DOCUMENTS BUCKET RLS POLICIES
-- ============================================================================

-- Landlords can upload documents to properties they own
CREATE POLICY "Landlords can upload documents to their properties"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM properties WHERE owner_id = auth.uid()
    )
  );

-- Landlords can delete documents from properties they own
CREATE POLICY "Landlords can delete documents from their properties"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM properties WHERE owner_id = auth.uid()
    )
  );

-- Users can read documents for properties/leases they have access to
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

-- ============================================================================
-- AVATARS BUCKET RLS POLICIES
-- ============================================================================

-- Users can upload their own avatar
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own avatar
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

-- Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone can read avatars (public profiles)
CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated'
  );

-- Add comment for documentation
COMMENT ON TABLE storage.objects IS 'Storage objects with RLS policies for documents, images, and avatars buckets.';

