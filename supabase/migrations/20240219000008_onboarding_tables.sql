-- Onboarding templates and submissions for tenant move-in checklists

-- Templates: landlords define per-property onboarding checklists
CREATE TABLE IF NOT EXISTS public.onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Move-In Checklist',
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_onboarding_templates_property ON public.onboarding_templates(property_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_templates_active ON public.onboarding_templates(property_id, is_active) WHERE is_active = true;

-- Submissions: tracks each tenant's progress through an onboarding template
CREATE TABLE IF NOT EXISTS public.onboarding_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.onboarding_templates(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'submitted', 'reviewed', 'reopened')),
  completed_fields INTEGER NOT NULL DEFAULT 0,
  total_fields INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reopened_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, template_id)
);
ALTER TABLE public.onboarding_submissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_tenant ON public.onboarding_submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_template ON public.onboarding_submissions(template_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_status ON public.onboarding_submissions(status);

-- Auto-update updated_at triggers
CREATE OR REPLACE FUNCTION update_onboarding_templates_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS onboarding_templates_updated_at ON public.onboarding_templates;
CREATE TRIGGER onboarding_templates_updated_at BEFORE UPDATE ON public.onboarding_templates FOR EACH ROW EXECUTE FUNCTION update_onboarding_templates_updated_at();

CREATE OR REPLACE FUNCTION update_onboarding_submissions_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS onboarding_submissions_updated_at ON public.onboarding_submissions;
CREATE TRIGGER onboarding_submissions_updated_at BEFORE UPDATE ON public.onboarding_submissions FOR EACH ROW EXECUTE FUNCTION update_onboarding_submissions_updated_at();

-- RLS: Onboarding Templates
-- Landlords can manage templates for properties they own
DROP POLICY IF EXISTS "Landlords can view own property templates" ON public.onboarding_templates;
CREATE POLICY "Landlords can view own property templates" ON public.onboarding_templates
  FOR SELECT USING (
    property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())
    OR public.user_can_access_property(property_id)
  );

DROP POLICY IF EXISTS "Landlords can create templates for own properties" ON public.onboarding_templates;
CREATE POLICY "Landlords can create templates for own properties" ON public.onboarding_templates
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND (
      property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())
      OR public.user_can_access_property(property_id)
    )
  );

DROP POLICY IF EXISTS "Landlords can update own property templates" ON public.onboarding_templates;
CREATE POLICY "Landlords can update own property templates" ON public.onboarding_templates
  FOR UPDATE USING (
    property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())
    OR public.user_can_access_property(property_id)
  );

DROP POLICY IF EXISTS "Landlords can delete own property templates" ON public.onboarding_templates;
CREATE POLICY "Landlords can delete own property templates" ON public.onboarding_templates
  FOR DELETE USING (
    property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())
    OR public.user_can_access_property(property_id)
  );

-- Tenants can view active templates for their assigned property
DROP POLICY IF EXISTS "Tenants can view templates for their property" ON public.onboarding_templates;
CREATE POLICY "Tenants can view templates for their property" ON public.onboarding_templates
  FOR SELECT USING (
    is_active = true
    AND property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.tenants t ON t.property_id = p.id
      WHERE t.user_id = auth.uid()
    )
  );

-- RLS: Onboarding Submissions
-- Tenants can manage their own submissions
DROP POLICY IF EXISTS "Tenants can view own submissions" ON public.onboarding_submissions;
CREATE POLICY "Tenants can view own submissions" ON public.onboarding_submissions
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Tenants can create own submissions" ON public.onboarding_submissions;
CREATE POLICY "Tenants can create own submissions" ON public.onboarding_submissions
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Tenants can update own submissions" ON public.onboarding_submissions;
CREATE POLICY "Tenants can update own submissions" ON public.onboarding_submissions
  FOR UPDATE USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );

-- Landlords can view and update submissions for their properties
DROP POLICY IF EXISTS "Landlords can view submissions for own properties" ON public.onboarding_submissions;
CREATE POLICY "Landlords can view submissions for own properties" ON public.onboarding_submissions
  FOR SELECT USING (
    template_id IN (
      SELECT ot.id FROM public.onboarding_templates ot
      JOIN public.properties p ON ot.property_id = p.id
      WHERE p.owner_id = auth.uid() OR public.user_can_access_property(p.id)
    )
  );

DROP POLICY IF EXISTS "Landlords can update submissions for own properties" ON public.onboarding_submissions;
CREATE POLICY "Landlords can update submissions for own properties" ON public.onboarding_submissions
  FOR UPDATE USING (
    template_id IN (
      SELECT ot.id FROM public.onboarding_templates ot
      JOIN public.properties p ON ot.property_id = p.id
      WHERE p.owner_id = auth.uid() OR public.user_can_access_property(p.id)
    )
  );

-- Storage bucket for onboarding images
INSERT INTO storage.buckets (id, name, public)
VALUES ('onboarding-images', 'onboarding-images', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload onboarding images" ON storage.objects;
CREATE POLICY "Authenticated users can upload onboarding images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'onboarding-images' AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can view own onboarding images" ON storage.objects;
CREATE POLICY "Users can view own onboarding images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'onboarding-images' AND auth.role() = 'authenticated'
  );
