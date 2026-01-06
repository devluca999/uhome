-- RLS Policies for messages table
-- Run this in Supabase SQL Editor

-- Tenants can view messages for their leases
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
  );

-- Landlords can view messages for leases on their properties
CREATE POLICY "Landlords can view messages for their property leases"
  ON public.messages
  FOR SELECT
  USING (
    lease_id IN (
      SELECT id FROM public.leases
      WHERE property_id IN (
        SELECT id FROM public.properties
        WHERE owner_id = auth.uid()
          OR organization_id IN (
            SELECT organization_id FROM public.memberships
            WHERE user_id = auth.uid() AND role IN ('owner', 'collaborator')
          )
      )
    )
  );

-- Tenants can send messages for their active leases only
CREATE POLICY "Tenants can send messages for their active leases"
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
  );

-- Landlords can send messages for active leases on their properties only
CREATE POLICY "Landlords can send messages for their active property leases"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    lease_id IN (
      SELECT id FROM public.leases
      WHERE property_id IN (
        SELECT id FROM public.properties
        WHERE owner_id = auth.uid()
          OR organization_id IN (
            SELECT organization_id FROM public.memberships
            WHERE user_id = auth.uid() AND role IN ('owner', 'collaborator')
          )
      )
      AND (lease_end_date IS NULL OR lease_end_date > NOW())
    )
    AND sender_id = auth.uid()
    AND sender_role = 'landlord'
  );

-- Users can update their own messages (for soft delete)
-- Note: Field-level restrictions (only soft_deleted_at/status) are enforced at application level
CREATE POLICY "Users can update their own messages"
  ON public.messages
  FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Landlords can update messages in their property leases (for status updates)
-- Note: Field-level restrictions (only status) are enforced at application level
CREATE POLICY "Landlords can update messages in their property leases"
  ON public.messages
  FOR UPDATE
  USING (
    lease_id IN (
      SELECT id FROM public.leases
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
  WITH CHECK (
    lease_id IN (
      SELECT id FROM public.leases
      WHERE property_id IN (
        SELECT id FROM public.properties
        WHERE owner_id = auth.uid()
          OR organization_id IN (
            SELECT organization_id FROM public.memberships
            WHERE user_id = auth.uid() AND role IN ('owner', 'collaborator')
          )
      )
    )
  );

-- No DELETE policy - messages are immutable (preserve audit trail)

