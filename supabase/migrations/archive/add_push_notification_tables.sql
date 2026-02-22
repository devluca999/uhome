-- Add push notification infrastructure
-- Extends notifications table and adds push subscription tracking

-- Add push tracking columns to notifications table
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS push_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS push_delivered_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS push_failed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS push_error TEXT;

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE, -- Push service endpoint URL
  p256dh TEXT NOT NULL, -- Public key for encryption
  auth TEXT NOT NULL, -- Authentication secret
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);

-- RLS Policies
CREATE POLICY "Users can view their own push subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions"
  ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions"
  ON public.push_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
  ON public.push_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comment
COMMENT ON TABLE public.push_subscriptions IS 'Stores VAPID push notification subscriptions for web push. Each user can have multiple subscriptions (different devices/browsers).';
