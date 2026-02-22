-- Create helper functions for organization management
-- Run this in Supabase SQL Editor

-- Function: Get organization by owner user_id (idempotent lookup)
CREATE OR REPLACE FUNCTION public.get_organization_by_owner(owner_user_id UUID)
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id
  FROM public.memberships
  WHERE user_id = owner_user_id
    AND role = 'owner'
  LIMIT 1;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Ensure landlord has organization (idempotent auto-creation)
-- This function is called by application code, not used in triggers
-- Application should handle the actual creation to avoid permission issues
CREATE OR REPLACE FUNCTION public.ensure_landlord_organization(owner_user_id UUID, org_name TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  existing_org_id UUID;
  new_org_id UUID;
  final_org_name TEXT;
BEGIN
  -- Check if organization already exists
  SELECT get_organization_by_owner(owner_user_id) INTO existing_org_id;
  
  IF existing_org_id IS NOT NULL THEN
    RETURN existing_org_id;
  END IF;
  
  -- Set default name if not provided
  IF org_name IS NULL OR org_name = '' THEN
    final_org_name := 'My Properties';
  ELSE
    final_org_name := org_name;
  END IF;
  
  -- Create organization
  INSERT INTO public.organizations (name)
  VALUES (final_org_name)
  RETURNING id INTO new_org_id;
  
  -- Create owner membership
  INSERT INTO public.memberships (organization_id, user_id, role)
  VALUES (new_org_id, owner_user_id, 'owner');
  
  -- Create default free subscription
  INSERT INTO public.subscriptions (organization_id, plan, status)
  VALUES (new_org_id, 'free', 'active');
  
  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get all organizations for a user
CREATE OR REPLACE FUNCTION public.get_user_organizations(user_id_param UUID, role_filter TEXT DEFAULT NULL)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.organization_id,
    o.name,
    m.role,
    m.created_at
  FROM public.memberships m
  JOIN public.organizations o ON o.id = m.organization_id
  WHERE m.user_id = user_id_param
    AND (role_filter IS NULL OR m.role = role_filter)
  ORDER BY m.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Count landlord-side users in organization (owner + collaborator)
CREATE OR REPLACE FUNCTION public.get_organization_landlord_count(org_id UUID)
RETURNS INTEGER AS $$
DECLARE
  landlord_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO landlord_count
  FROM public.memberships
  WHERE organization_id = org_id
    AND role IN ('owner', 'collaborator');
  
  RETURN landlord_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if organization can add collaborator (Pro plan + under limit)
CREATE OR REPLACE FUNCTION public.can_add_collaborator(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  sub_plan TEXT;
  landlord_count INTEGER;
BEGIN
  -- Check subscription plan
  SELECT plan INTO sub_plan
  FROM public.subscriptions
  WHERE organization_id = org_id
    AND status = 'active';
  
  -- Must be Pro plan
  IF sub_plan != 'pro' THEN
    RETURN FALSE;
  END IF;
  
  -- Check current landlord count
  SELECT get_organization_landlord_count(org_id) INTO landlord_count;
  
  -- Hard cap: 2 landlord-side users (owner + 1 collaborator)
  RETURN landlord_count < 2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION public.get_organization_by_owner(UUID) IS 'Get organization ID for a given owner user. Returns NULL if not found.';
COMMENT ON FUNCTION public.ensure_landlord_organization(UUID, TEXT) IS 'Idempotent function to ensure landlord has an organization. Creates org, membership, and default subscription if missing. Safe to call multiple times.';
COMMENT ON FUNCTION public.get_user_organizations(UUID, TEXT) IS 'Get all organizations for a user, optionally filtered by role.';
COMMENT ON FUNCTION public.get_organization_landlord_count(UUID) IS 'Count landlord-side users (owner + collaborator) in an organization. Used for Pro plan limit checking.';
COMMENT ON FUNCTION public.can_add_collaborator(UUID) IS 'Check if organization can add a collaborator. Returns true only if Pro plan and under 2 landlord-side user limit.';

