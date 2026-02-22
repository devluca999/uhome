-- Add message_type to messages table to distinguish between landlord-tenant and household messaging
-- This enforces lease-scoped messaging with clear participant boundaries

-- Add message_type column
ALTER TABLE public.messages ADD COLUMN message_type TEXT CHECK (message_type IN ('landlord_tenant', 'household')) NOT NULL DEFAULT 'landlord_tenant';

-- Update existing messages: all current messages are landlord_tenant type
-- (No migration needed since we have a default)

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_lease_type ON public.messages(lease_id, message_type);

-- Update RLS policies to enforce message type boundaries
-- Tenants can only see household messages, not landlord-tenant messages
DROP POLICY IF EXISTS "Tenants can view messages for their leases" ON public.messages;
CREATE POLICY "Tenants can view messages for their leases"
  ON public.messages
  FOR SELECT
  USING (
    lease_id IN (
      SELECT id FROM public.leases
      WHERE tenant_id IN (
        SELECT id FROM public.tenants
        WHERE user_id = auth.uid()
      )
    )
    AND message_type = 'household' -- Tenants only see household messages
  );

-- Landlords can only see landlord-tenant messages, not household messages
DROP POLICY IF EXISTS "Landlords can view messages for their property leases" ON public.messages;
CREATE POLICY "Landlords can view messages for their unit leases"
  ON public.messages
  FOR SELECT
  USING (
    lease_id IN (
      SELECT id FROM public.leases
      WHERE unit_id IN (
        SELECT id FROM public.units
        WHERE property_id IN (
          SELECT id FROM public.properties
          WHERE owner_id = auth.uid()
            OR organization_id IN (
              SELECT organization_id FROM public.memberships
              WHERE user_id = auth.uid() AND role IN ('owner', 'collaborator')
            )
        )
      )
    )
    AND message_type = 'landlord_tenant' -- Landlords only see landlord-tenant messages
  );

-- Tenants can only send household messages
DROP POLICY IF EXISTS "Tenants can send messages for their active leases" ON public.messages;
CREATE POLICY "Tenants can send household messages for their active leases"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    lease_id IN (
      SELECT id FROM public.leases
      WHERE tenant_id IN (
        SELECT id FROM public.tenants
        WHERE user_id = auth.uid()
      )
      AND (lease_end_date IS NULL OR lease_end_date > NOW())
    )
    AND sender_id = auth.uid()
    AND sender_role = 'tenant'
    AND message_type = 'household' -- Tenants can only send household messages
  );

-- Landlords can only send landlord-tenant messages
DROP POLICY IF EXISTS "Landlords can send messages for their active property leases" ON public.messages;
CREATE POLICY "Landlords can send landlord-tenant messages for their active unit leases"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    lease_id IN (
      SELECT id FROM public.leases
      WHERE unit_id IN (
        SELECT id FROM public.units
        WHERE property_id IN (
          SELECT id FROM public.properties
          WHERE owner_id = auth.uid()
            OR organization_id IN (
              SELECT organization_id FROM public.memberships
              WHERE user_id = auth.uid() AND role IN ('owner', 'collaborator')
            )
        )
      )
      AND (lease_end_date IS NULL OR lease_end_date > NOW())
    )
    AND sender_id = auth.uid()
    AND sender_role = 'landlord'
    AND message_type = 'landlord_tenant' -- Landlords can only send landlord-tenant messages
  );

-- Update comment
COMMENT ON TABLE public.messages IS 'Lease-scoped messages with explicit message types. landlord_tenant: landlord + all tenants on lease. household: tenants only (no landlord). Messages are immutable. Use soft_deleted_at for removal.';