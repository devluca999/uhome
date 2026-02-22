-- Create support_tickets table for lightweight support system
-- Run this in Supabase SQL Editor
-- IMPORTANT: Lightweight support ticket system for user issues
-- Status tracking and resolution capabilities only (no assignments, comments, priorities per requirements)

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT CHECK (status IN ('open', 'resolved')) NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE NULL,
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger (if needed in future)
-- Note: support_tickets doesn't have updated_at column per minimal design

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_status ON public.support_tickets(user_id, status);

-- Add comment for documentation
COMMENT ON TABLE public.support_tickets IS 'Lightweight support ticket system. Users can create tickets, admins can view and mark as resolved. No assignments, comments, priorities, or automations.';
