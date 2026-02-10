-- Add email notification infrastructure
-- Extends notifications table and adds email delivery tracking

-- Add email tracking columns to notifications table
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS email_delivered_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS email_failed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS email_error TEXT;

-- Create email_deliveries table for detailed tracking
CREATE TABLE IF NOT EXISTS public.email_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  postal_message_id TEXT, -- Postal message ID for tracking
  status TEXT CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed')) NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_preferences table for opt-out handling
CREATE TABLE IF NOT EXISTS public.email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  email_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  email_digest_enabled BOOLEAN NOT NULL DEFAULT true,
  email_marketing_enabled BOOLEAN NOT NULL DEFAULT false,
  opted_out_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.email_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_email_deliveries_notification_id ON public.email_deliveries(notification_id);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_user_id ON public.email_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_status ON public.email_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_postal_message_id ON public.email_deliveries(postal_message_id);
CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON public.email_preferences(user_id);

-- RLS Policies for email_deliveries
CREATE POLICY "Users can view their own email deliveries"
  ON public.email_deliveries
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for email_preferences
CREATE POLICY "Users can view their own email preferences"
  ON public.email_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own email preferences"
  ON public.email_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email preferences"
  ON public.email_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE public.email_deliveries IS 'Tracks email delivery status from Postal. Links to notifications for audit trail.';
COMMENT ON TABLE public.email_preferences IS 'User email notification preferences. Respects opt-out for GDPR/CCPA compliance.';
