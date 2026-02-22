-- Storage RLS Policies for Images Bucket
-- This migration creates RLS policies for the 'images' bucket to allow:
-- - Landlords to upload images to their properties
-- - Tenants to upload images to their leases
-- - Both to read images scoped to their access

-- Note: The 'images' bucket must be created manually in Supabase Dashboard
-- with public read access before running this migration.

-- ============================================================================
-- Landlords can upload images to their properties
-- ============================================================================

CREATE POLICY "Landlords can upload images to their properties"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- ============================================================================
-- Tenants can upload images to their leases
-- ============================================================================

CREATE POLICY "Tenants can upload images to their leases"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
      SELECT l.id::text 
      FROM public.leases l
      JOIN public.tenants t ON t.id = l.tenant_id
      WHERE t.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Landlords can read images for their properties
-- ============================================================================

CREATE POLICY "Landlords can read images for their properties"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'images' AND
    auth.role() = 'authenticated' AND
    (
      -- Images scoped to properties the landlord owns
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.properties WHERE owner_id = auth.uid()
      )
      OR
      -- Images scoped to leases on properties the landlord owns
      (storage.foldername(name))[1] IN (
        SELECT l.id::text 
        FROM public.leases l
        JOIN public.properties p ON p.id = l.property_id
        WHERE p.owner_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- Tenants can read images for their leases
-- ============================================================================

CREATE POLICY "Tenants can read images for their leases"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
      SELECT l.id::text 
      FROM public.leases l
      JOIN public.tenants t ON t.id = l.tenant_id
      WHERE t.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Landlords can delete images from their properties
-- ============================================================================

CREATE POLICY "Landlords can delete images from their properties"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'images' AND
    auth.role() = 'authenticated' AND
    (
      -- Images scoped to properties the landlord owns
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.properties WHERE owner_id = auth.uid()
      )
      OR
      -- Images scoped to leases on properties the landlord owns
      (storage.foldername(name))[1] IN (
        SELECT l.id::text 
        FROM public.leases l
        JOIN public.properties p ON p.id = l.property_id
        WHERE p.owner_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- Tenants can delete their own uploaded images
-- ============================================================================

CREATE POLICY "Tenants can delete their uploaded images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'images' AND
    auth.role() = 'authenticated' AND
    owner = auth.uid()
  );

