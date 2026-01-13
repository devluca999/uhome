-- Add RLS policy to allow users to read email addresses of related users
-- This enables:
-- - Tenants to see landlord contact info
-- - Tenants to see housemate emails
-- - Both roles to see message sender emails
-- Run this in Supabase SQL Editor

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can read emails of users in same property" ON public.users;
DROP POLICY IF EXISTS "Users can read related user emails" ON public.users;

-- Allow users to read email addresses of users they interact with
CREATE POLICY "Users can read related user emails"
ON public.users
FOR SELECT
USING (
  -- Users can always read their own email
  id = auth.uid()
  OR
  -- Tenants can read emails of:
  -- 1. Other tenants in the same property
  id IN (
    SELECT t2.user_id 
    FROM tenants t1
    JOIN tenants t2 ON t1.property_id = t2.property_id
    WHERE t1.user_id = auth.uid()
  )
  OR
  -- 2. Their landlords (property owners)
  id IN (
    SELECT p.owner_id
    FROM tenants t
    JOIN properties p ON t.property_id = p.id
    WHERE t.user_id = auth.uid()
  )
  OR
  -- Landlords can read emails of:
  -- 1. Tenants in their properties
  id IN (
    SELECT t.user_id
    FROM tenants t
    JOIN properties p ON t.property_id = p.id
    WHERE p.owner_id = auth.uid()
  )
  OR
  -- 2. Message participants in their leases
  id IN (
    SELECT m.sender_id
    FROM messages m
    JOIN leases l ON m.lease_id = l.id
    JOIN properties p ON l.property_id = p.id
    WHERE p.owner_id = auth.uid()
  )
  OR
  -- Tenants can read message participants in their leases
  id IN (
    SELECT m.sender_id
    FROM messages m
    JOIN leases l ON m.lease_id = l.id
    JOIN tenants t ON l.tenant_id = t.id
    WHERE t.user_id = auth.uid()
  )
);

-- Add comment for documentation
COMMENT ON POLICY "Users can read related user emails" ON public.users IS 
'Allows users to read email addresses of users they interact with: landlords can see tenant emails, tenants can see their landlord and housemates, and both can see message senders in their conversations.';

