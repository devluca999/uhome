-- Add compliance tables for GDPR/CCPA
-- Supports Phase 7: Compliance & Documentation

-- Data deletion requests table
CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'completed')) NOT NULL DEFAULT 'pending',
  reason TEXT, -- User's reason for deletion request
  admin_notes TEXT, -- Admin notes for approval/rejection
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data export requests table
CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_at TIMESTAMP WITH TIME ZONE,
  download_url TEXT, -- Signed URL to download ZIP file
  expires_at TIMESTAMP WITH TIME ZONE, -- URL expiration (e.g., 7 days)
  status TEXT CHECK (status IN ('pending', 'generating', 'ready', 'expired', 'downloaded')) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance audit log table
CREATE TABLE IF NOT EXISTS public.compliance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL, -- 'data_deletion', 'data_export', 'consent_update', etc.
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Admin who performed action
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB, -- Additional context
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_audit_log ENABLE ROW LEVEL SECURITY;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON public.data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status ON public.data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_id ON public.data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON public.data_export_requests(status);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_log_user_id ON public.compliance_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_log_action ON public.compliance_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_log_timestamp ON public.compliance_audit_log(timestamp DESC);

-- RLS Policies
-- Data deletion requests: Users can view their own, admins can view all
CREATE POLICY "Users can view their own deletion requests"
  ON public.data_deletion_requests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all deletion requests"
  ON public.data_deletion_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can create their own deletion requests"
  ON public.data_deletion_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update deletion requests"
  ON public.data_deletion_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Data export requests: Users can view their own, admins can view all
CREATE POLICY "Users can view their own export requests"
  ON public.data_export_requests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all export requests"
  ON public.data_export_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can create their own export requests"
  ON public.data_export_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update export requests"
  ON public.data_export_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Compliance audit log: Admin-only access
CREATE POLICY "Only admins can view compliance audit log"
  ON public.compliance_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "System can insert compliance audit log"
  ON public.compliance_audit_log
  FOR INSERT
  WITH CHECK (true); -- System inserts (via service role)

-- Comments
COMMENT ON TABLE public.data_deletion_requests IS 'GDPR/CCPA right-to-delete requests. Supports soft delete with 30-day retention period.';
COMMENT ON TABLE public.data_export_requests IS 'GDPR/CCPA right-to-export requests. Generates ZIP file with all user data.';
COMMENT ON TABLE public.compliance_audit_log IS 'Immutable audit trail for all compliance-related actions (deletions, exports, consent updates).';
