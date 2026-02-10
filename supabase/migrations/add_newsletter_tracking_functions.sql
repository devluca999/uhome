-- Add database functions for newsletter analytics tracking
-- Supports tracking opens and clicks for newsletter campaigns

-- Function to increment opened_count
CREATE OR REPLACE FUNCTION increment_newsletter_opened(campaign_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE newsletter_campaigns
  SET opened_count = opened_count + 1
  WHERE id = campaign_id;
END;
$$;

-- Function to increment clicked_count
CREATE OR REPLACE FUNCTION increment_newsletter_clicked(campaign_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE newsletter_campaigns
  SET clicked_count = clicked_count + 1
  WHERE id = campaign_id;
END;
$$;

-- Add comments
COMMENT ON FUNCTION increment_newsletter_opened IS 'Increments the opened_count for a newsletter campaign when a tracking pixel is loaded';
COMMENT ON FUNCTION increment_newsletter_clicked IS 'Increments the clicked_count for a newsletter campaign when a link is clicked';
