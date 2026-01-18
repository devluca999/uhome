# 🚀 Storage Buckets Setup Guide

## ❌ Current Issue
```
StorageApiError: Bucket not found
```

**Cause**: The storage buckets haven't been created in Supabase yet.

## ✅ Solution: Apply Migrations

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Create Storage Buckets

Copy and paste this SQL and run it:

```sql
-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  52428800, -- 50MB
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
```

### Step 3: Apply RLS Policies

**For Documents & Avatars:**

```sql
-- Documents: Landlords can upload to their properties
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
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM properties WHERE owner_id = auth.uid()
      ) OR
      (storage.foldername(name))[1] IN (
        SELECT property_id::text FROM tenants WHERE user_id = auth.uid()
      )
    )
  );

-- Avatars: Users can manage their own
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
```

**For Images** (if not already applied):

```sql
-- Check if policies exist first
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
      SELECT lease_id::text FROM tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'images' AND
    auth.role() = 'authenticated' AND
    (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM properties WHERE owner_id = auth.uid()
      ) OR
      (storage.foldername(name))[1] IN (
        SELECT property_id::text FROM tenants WHERE user_id = auth.uid()
      )
    )
  );
```

### Step 4: Add image_urls to maintenance_requests

```sql
ALTER TABLE public.maintenance_requests
ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_image_urls 
ON public.maintenance_requests USING GIN (image_urls);
```

### Step 5: Refresh Your App

Hard refresh the browser (Ctrl+Shift+R / Cmd+Shift+R)

## ✅ Test It Works

1. **Profile Picture**: Go to Settings → Upload a profile picture
2. **Maintenance Request**: Create a work order → Attach photos
3. **Documents**: (Landlord) Upload a property document

---

## 📝 Quick Reference

| Bucket | Max Size | Allowed Types | Purpose |
|--------|----------|---------------|---------|
| `avatars` | 2MB | JPG, PNG, WebP | Profile pictures |
| `images` | 10MB | JPG, PNG, GIF, WebP, SVG | Maintenance photos |
| `documents` | 50MB | PDF, DOC, DOCX, TXT, XLS, XLSX | Property documents |

## 🔒 Security

- **Avatars**: Scoped to user ID (folder = user ID)
- **Images**: Scoped to property ID or lease ID
- **Documents**: Scoped to property ID
- All buckets protected by RLS policies
- Public URLs but authenticated access only
