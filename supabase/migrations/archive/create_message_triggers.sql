-- Triggers and functions for messages table
-- Run this in Supabase SQL Editor

-- Function to create notifications for message recipients
CREATE OR REPLACE FUNCTION public.create_message_notifications()
RETURNS TRIGGER AS $$
DECLARE
  lease_record RECORD;
  tenant_user_id UUID;
  landlord_user_id UUID;
BEGIN
  -- Get lease information
  SELECT l.*, p.owner_id INTO lease_record
  FROM public.leases l
  JOIN public.properties p ON p.id = l.property_id
  WHERE l.id = NEW.lease_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Get tenant user_id
  SELECT user_id INTO tenant_user_id
  FROM public.tenants
  WHERE id = lease_record.tenant_id;

  -- Create notification for tenant (if message not from tenant)
  IF NEW.sender_role != 'tenant' AND tenant_user_id IS NOT NULL AND tenant_user_id != NEW.sender_id THEN
    INSERT INTO public.notifications (user_id, lease_id, type, read)
    VALUES (tenant_user_id, NEW.lease_id, 'message', false);
  END IF;

  -- Create notification for landlord (if message not from landlord)
  IF NEW.sender_role != 'landlord' AND lease_record.owner_id IS NOT NULL AND lease_record.owner_id != NEW.sender_id THEN
    INSERT INTO public.notifications (user_id, lease_id, type, read)
    VALUES (lease_record.owner_id, NEW.lease_id, 'message', false);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notifications when a message is inserted
CREATE TRIGGER create_notifications_on_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_message_notifications();

-- Function to check if lease is active (used for read-only enforcement)
CREATE OR REPLACE FUNCTION public.is_lease_active(lease_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  end_date DATE;
BEGIN
  SELECT lease_end_date INTO end_date
  FROM public.leases
  WHERE id = lease_uuid;

  RETURN end_date IS NULL OR end_date > CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to create system messages
CREATE OR REPLACE FUNCTION public.create_system_message(
  p_lease_id UUID,
  p_body TEXT,
  p_intent TEXT DEFAULT 'notice',
  p_status TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  message_id UUID;
BEGIN
  INSERT INTO public.messages (
    lease_id,
    sender_id,
    sender_role,
    body,
    intent,
    status
  ) VALUES (
    p_lease_id,
    NULL, -- System messages have no sender_id
    'system',
    p_body,
    p_intent,
    p_status
  )
  RETURNING id INTO message_id;

  RETURN message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION public.create_message_notifications() IS 'Creates notifications for message recipients (tenant and/or landlord, excluding sender)';
COMMENT ON FUNCTION public.is_lease_active(UUID) IS 'Returns true if lease is active (no end date or end date in future)';
COMMENT ON FUNCTION public.create_system_message(UUID, TEXT, TEXT, TEXT) IS 'Helper function to create system-generated messages. Used by application code or other triggers.';

