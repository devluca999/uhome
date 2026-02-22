-- Create messages table for lease-based messaging
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sender_role TEXT CHECK (sender_role IN ('tenant', 'landlord', 'system')) NOT NULL,
  body TEXT NOT NULL,
  intent TEXT CHECK (intent IN ('general', 'maintenance', 'billing', 'notice')) NOT NULL DEFAULT 'general',
  status TEXT CHECK (status IN ('open', 'acknowledged', 'resolved')) NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  soft_deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_messages_lease_id ON public.messages(lease_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_lease_created ON public.messages(lease_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_soft_deleted ON public.messages(lease_id, soft_deleted_at) WHERE soft_deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON TABLE public.messages IS 'Messages are immutable. Use soft_deleted_at for removal, preserve for audit. Messages reference lease_id directly (one thread per lease). Supports intent-based categorization and optional status tracking.';

