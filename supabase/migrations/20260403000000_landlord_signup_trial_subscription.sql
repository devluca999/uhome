-- Auto-provision organization, owner membership, and 30-day landlord trial subscription
-- when a public.users row represents a landlord.
--
-- Note: Signup currently inserts users as tenant via handle_new_user() then updates
-- role to landlord in the app, so an UPDATE OF role trigger is required for that path.

CREATE OR REPLACE FUNCTION public.provision_landlord_org_and_trial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_org_name TEXT;
BEGIN
  IF NEW.role IS DISTINCT FROM 'landlord' THEN
    RETURN NEW;
  END IF;

  SELECT m.organization_id
  INTO v_org_id
  FROM public.memberships m
  WHERE m.user_id = NEW.id
    AND m.role = 'owner'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    v_org_name := COALESCE(
      NULLIF(trim(COALESCE(NEW.full_name, '')), ''),
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'My Properties'
    );

    INSERT INTO public.organizations (name)
    VALUES (v_org_name)
    RETURNING id INTO v_org_id;

    INSERT INTO public.memberships (organization_id, user_id, role)
    VALUES (v_org_id, NEW.id, 'owner')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END IF;

  INSERT INTO public.subscriptions (
    organization_id,
    plan,
    status,
    trial_end,
    current_period_start,
    current_period_end
  )
  VALUES (
    v_org_id,
    'landlord',
    'trialing',
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW() + INTERVAL '30 days'
  )
  ON CONFLICT (organization_id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.provision_landlord_org_and_trial() IS
  'Ensures landlord users have an owned organization, owner membership, and a trial landlord subscription (idempotent).';

DROP TRIGGER IF EXISTS trg_provision_landlord_trial_on_users_insert ON public.users;
CREATE TRIGGER trg_provision_landlord_trial_on_users_insert
  AFTER INSERT ON public.users
  FOR EACH ROW
  WHEN (NEW.role = 'landlord')
  EXECUTE FUNCTION public.provision_landlord_org_and_trial();

DROP TRIGGER IF EXISTS trg_provision_landlord_trial_on_users_role_update ON public.users;
CREATE TRIGGER trg_provision_landlord_trial_on_users_role_update
  AFTER UPDATE OF role ON public.users
  FOR EACH ROW
  WHEN (NEW.role = 'landlord')
  EXECUTE FUNCTION public.provision_landlord_org_and_trial();

NOTIFY pgrst, 'reload schema';
