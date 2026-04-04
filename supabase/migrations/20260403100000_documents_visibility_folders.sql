-- Document visibility (private | landlord | household) and optional folder grouping

CREATE TABLE IF NOT EXISTS public.document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_folders_property_id ON public.document_folders(property_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_lease_id ON public.document_folders(lease_id);

ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_document_folders" ON public.document_folders;
CREATE POLICY "allow_all_document_folders" ON public.document_folders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'household';
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_visibility_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_visibility_check CHECK (visibility IN ('private', 'landlord', 'household'));

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.document_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON public.documents(folder_id);

COMMENT ON COLUMN public.documents.visibility IS 'Who can see this document besides the uploader: private, landlord, or household';
COMMENT ON COLUMN public.documents.folder_id IS 'Optional folder grouping for UI';
