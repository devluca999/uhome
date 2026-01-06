-- RLS Policies for notifications table
-- Run this in Supabase SQL Editor

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Notifications are created by triggers, not directly by users
-- No INSERT policy needed (triggers run with service role)

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- No DELETE policy - preserve notification history

