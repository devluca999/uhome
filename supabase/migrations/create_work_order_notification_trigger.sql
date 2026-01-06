-- Work Order Notification System with Explicit Scoping Rules
-- Implements property-scoped notifications with role-based rules

-- ============================================================================
-- Trigger 1: Notify landlords when tenant creates a work order
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_landlord_work_order_created()
RETURNS TRIGGER AS $$
DECLARE
  property_landlords UUID[];
  landlord_id UUID;
  property_name TEXT;
BEGIN
  -- Only notify for tenant-created work orders
  IF NEW.created_by_role != 'tenant' THEN
    RETURN NEW;
  END IF;

  -- Only notify if work order is visible to tenants (tenant-created are always visible)
  IF NEW.visibility_to_tenants = false THEN
    RETURN NEW;
  END IF;

  -- Get property name for notification
  SELECT name INTO property_name
  FROM public.properties
  WHERE id = NEW.property_id;

  -- Get all landlords/managers for this property
  -- Start with property owner
  SELECT ARRAY_AGG(DISTINCT owner_id)
  INTO property_landlords
  FROM public.properties
  WHERE id = NEW.property_id
    AND owner_id IS NOT NULL;

  -- Add property managers (memberships with owner/collaborator role)
  -- Use COALESCE to handle NULL arrays properly
  SELECT COALESCE(ARRAY_AGG(DISTINCT m.user_id), ARRAY[]::UUID[]) || COALESCE(property_landlords, ARRAY[]::UUID[])
  INTO property_landlords
  FROM public.memberships m
  INNER JOIN public.properties p ON p.organization_id = m.organization_id
  WHERE p.id = NEW.property_id
    AND m.role IN ('owner', 'collaborator')
    AND m.user_id IS NOT NULL;
  
  -- Remove duplicates
  SELECT ARRAY(SELECT DISTINCT unnest(property_landlords))
  INTO property_landlords;

  -- Create notifications for each landlord/manager
  IF property_landlords IS NOT NULL THEN
    FOREACH landlord_id IN ARRAY property_landlords
    LOOP
      INSERT INTO public.notifications (
        user_id,
        type,
        body,
        property_id,
        work_order_id,
        created_at
      ) VALUES (
        landlord_id,
        'work_order',
        'New work order submitted for ' || COALESCE(property_name, 'property') || ': ' || 
        COALESCE(NEW.public_description, NEW.description, 'Maintenance request'),
        NEW.property_id,
        NEW.id,
        NOW()
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Trigger 2: Notify tenants/landlords on status changes (with scoping rules)
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_work_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  property_tenants UUID[];
  property_landlords UUID[];
  user_id UUID;
  notification_body TEXT;
  property_name TEXT;
  should_notify_tenant BOOLEAN := false;
  should_notify_landlord BOOLEAN := false;
BEGIN
  -- Only notify on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Only notify if work order is visible to tenants (for tenant notifications)
  -- Internal-only work orders don't notify tenants
  IF NEW.visibility_to_tenants = false AND NEW.created_by_role = 'landlord' THEN
    RETURN NEW;
  END IF;

  -- Get property name
  SELECT name INTO property_name
  FROM public.properties
  WHERE id = NEW.property_id;

  -- ========================================================================
  -- TENANT-CREATED WORK ORDERS
  -- ========================================================================
  IF NEW.created_by_role = 'tenant' THEN
    -- Notify tenant when status changes to: seen, scheduled, resolved, closed
    IF NEW.status IN ('seen', 'scheduled', 'resolved', 'closed') THEN
      should_notify_tenant := true;
      
      notification_body := CASE NEW.status
        WHEN 'seen' THEN 'Your landlord has reviewed your work order: ' || COALESCE(NEW.public_description, NEW.description, 'Maintenance request')
        WHEN 'scheduled' THEN 'Maintenance has been scheduled for: ' || COALESCE(NEW.public_description, NEW.description, 'Maintenance request')
        WHEN 'resolved' THEN 'Work order has been resolved. Please confirm if the issue is fixed: ' || COALESCE(NEW.public_description, NEW.description, 'Maintenance request')
        WHEN 'closed' THEN 'Work order has been closed: ' || COALESCE(NEW.public_description, NEW.description, 'Maintenance request')
        ELSE NULL
      END;

      IF should_notify_tenant AND notification_body IS NOT NULL THEN
        -- Get all active tenants for this property
        SELECT ARRAY_AGG(t.user_id)
        INTO property_tenants
        FROM public.tenants t
        WHERE t.property_id = NEW.property_id
          AND t.user_id IS NOT NULL;

        -- Create notifications for each tenant
        IF property_tenants IS NOT NULL THEN
          FOREACH user_id IN ARRAY property_tenants
          LOOP
            INSERT INTO public.notifications (
              user_id,
              type,
              body,
              property_id,
              work_order_id,
              created_at
            ) VALUES (
              user_id,
              'work_order',
              notification_body,
              NEW.property_id,
              NEW.id,
              NOW()
            );
          END LOOP;
        END IF;
      END IF;
    END IF;
  END IF;

  -- ========================================================================
  -- LANDLORD-CREATED WORK ORDERS
  -- ========================================================================
  IF NEW.created_by_role = 'landlord' THEN
    -- Notify tenant when status changes to: scheduled, in_progress (optional), resolved, closed
    -- Do NOT notify when: created, seen, internal notes added
    IF NEW.status IN ('scheduled', 'in_progress', 'resolved', 'closed') THEN
      should_notify_tenant := true;
      
      notification_body := CASE NEW.status
        WHEN 'scheduled' THEN 'Maintenance has been scheduled for ' || COALESCE(property_name, 'your property') || ': ' || COALESCE(NEW.public_description, NEW.description, 'Maintenance request')
        WHEN 'in_progress' THEN 'Maintenance work has started for ' || COALESCE(property_name, 'your property') || ': ' || COALESCE(NEW.public_description, NEW.description, 'Maintenance request')
        WHEN 'resolved' THEN 'Work order has been resolved. Please confirm if the issue is fixed: ' || COALESCE(NEW.public_description, NEW.description, 'Maintenance request')
        WHEN 'closed' THEN 'Work order has been closed: ' || COALESCE(NEW.public_description, NEW.description, 'Maintenance request')
        ELSE NULL
      END;

      IF should_notify_tenant AND notification_body IS NOT NULL THEN
        -- Get all active tenants for this property
        SELECT ARRAY_AGG(t.user_id)
        INTO property_tenants
        FROM public.tenants t
        WHERE t.property_id = NEW.property_id
          AND t.user_id IS NOT NULL;

        -- Create notifications for each tenant
        IF property_tenants IS NOT NULL THEN
          FOREACH user_id IN ARRAY property_tenants
          LOOP
            INSERT INTO public.notifications (
              user_id,
              type,
              body,
              property_id,
              work_order_id,
              created_at
            ) VALUES (
              user_id,
              'work_order',
              notification_body,
              NEW.property_id,
              NEW.id,
              NOW()
            );
          END LOOP;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Trigger 3: Notify landlords when tenant adds comment/note to work order
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_landlord_work_order_comment()
RETURNS TRIGGER AS $$
DECLARE
  property_landlords UUID[];
  landlord_id UUID;
  work_order_id UUID;
  property_id UUID;
  work_order_description TEXT;
  property_name TEXT;
BEGIN
  -- Only notify for notes on work orders
  IF NEW.entity_type != 'work_order' THEN
    RETURN NEW;
  END IF;

  -- Get work order details
  SELECT id, property_id, public_description, description
  INTO work_order_id, property_id, work_order_description
  FROM public.maintenance_requests
  WHERE id::text = NEW.entity_id;

  -- If work order doesn't exist, skip
  IF work_order_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get property name
  SELECT name INTO property_name
  FROM public.properties
  WHERE id = property_id;

  -- Get all landlords/managers for this property
  -- Start with property owner
  SELECT ARRAY_AGG(DISTINCT owner_id)
  INTO property_landlords
  FROM public.properties
  WHERE id = property_id
    AND owner_id IS NOT NULL;

  -- Add property managers (memberships with owner/collaborator role)
  -- Use COALESCE to handle NULL arrays properly
  SELECT COALESCE(ARRAY_AGG(DISTINCT m.user_id), ARRAY[]::UUID[]) || COALESCE(property_landlords, ARRAY[]::UUID[])
  INTO property_landlords
  FROM public.memberships m
  INNER JOIN public.properties p ON p.organization_id = m.organization_id
  WHERE p.id = property_id
    AND m.role IN ('owner', 'collaborator')
    AND m.user_id IS NOT NULL;
  
  -- Remove duplicates
  SELECT ARRAY(SELECT DISTINCT unnest(property_landlords))
  INTO property_landlords;

  -- Create notifications for each landlord/manager
  IF property_landlords IS NOT NULL THEN
    FOREACH landlord_id IN ARRAY property_landlords
    LOOP
      -- Don't notify the author of the note
      IF landlord_id != NEW.user_id THEN
        INSERT INTO public.notifications (
          user_id,
          type,
          body,
          property_id,
          work_order_id,
          created_at
        ) VALUES (
          landlord_id,
          'work_order',
          'New comment on work order for ' || COALESCE(property_name, 'property') || ': ' || 
          COALESCE(work_order_description, 'Maintenance request'),
          property_id,
          work_order_id,
          NOW()
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Create Triggers
-- ============================================================================

-- Trigger: Notify landlords when tenant creates work order
DROP TRIGGER IF EXISTS work_order_created_notification ON public.maintenance_requests;
CREATE TRIGGER work_order_created_notification
  AFTER INSERT ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_landlord_work_order_created();

-- Trigger: Notify on status changes
DROP TRIGGER IF EXISTS work_order_status_change_notification ON public.maintenance_requests;
CREATE TRIGGER work_order_status_change_notification
  AFTER UPDATE OF status ON public.maintenance_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_work_order_status_change();

-- Trigger: Notify landlords when tenant adds comment
DROP TRIGGER IF EXISTS work_order_comment_notification ON public.notes;
CREATE TRIGGER work_order_comment_notification
  AFTER INSERT ON public.notes
  FOR EACH ROW
  WHEN (NEW.entity_type = 'work_order')
  EXECUTE FUNCTION notify_landlord_work_order_comment();

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON FUNCTION notify_landlord_work_order_created() IS 'Notifies property owners and managers when a tenant creates a work order';
COMMENT ON FUNCTION notify_work_order_status_change() IS 'Notifies tenants/landlords on work order status changes following explicit scoping rules';
COMMENT ON FUNCTION notify_landlord_work_order_comment() IS 'Notifies property owners and managers when a tenant adds a comment/note to a work order';
