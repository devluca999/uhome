# Supabase Storage Setup for Documents

To enable document uploads and downloads, you need to create a storage bucket in Supabase.

## Steps

1. **Go to Supabase Dashboard** → Storage
2. **Create a new bucket** named `documents`
3. **Set bucket to Public** (or configure RLS policies for private access)
4. **Configure RLS policies** if using private access:

```sql
-- Allow authenticated users to upload documents to properties they own
CREATE POLICY "Landlords can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- Allow authenticated users to read documents for their properties
CREATE POLICY "Users can read documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated' AND
    (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.properties WHERE owner_id = auth.uid()
      ) OR
      (storage.foldername(name))[1] IN (
        SELECT property_id::text FROM public.tenants WHERE user_id = auth.uid()
      )
    )
  );

-- Allow landlords to delete their own documents
CREATE POLICY "Landlords can delete documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.properties WHERE owner_id = auth.uid()
    )
  );
```

## Note

The document feature will work once the bucket is created. If you prefer private storage, adjust the policies above accordingly.

