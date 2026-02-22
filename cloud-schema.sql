


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."auto_end_leases"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.lease_end_date IS NOT NULL AND NEW.lease_end_date < CURRENT_DATE AND NEW.status != 'ended' THEN
    NEW.status = 'ended';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_end_leases"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."batch_end_expired_leases"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE updated_count INTEGER;
BEGIN
  UPDATE public.leases SET status = 'ended', updated_at = NOW()
  WHERE status IN ('draft', 'active') AND lease_end_date IS NOT NULL AND lease_end_date < CURRENT_DATE;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;


ALTER FUNCTION "public"."batch_end_expired_leases"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_add_collaborator"("org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."can_add_collaborator"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_quota"("p_user_id" "uuid", "p_quota_type" "text", "p_is_staging" boolean DEFAULT false) RETURNS TABLE("has_quota" boolean, "limit_value" integer, "used_count" integer, "remaining" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_role TEXT;
  v_limit INTEGER;
  v_multiplier DECIMAL(3, 2);
  v_effective_limit INTEGER;
  v_used_count INTEGER;
  v_remaining INTEGER;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role
  FROM public.users
  WHERE id = p_user_id;

  IF v_user_role IS NULL THEN
    -- User not found, deny
    RETURN QUERY SELECT false, 0, 0, 0;
    RETURN;
  END IF;

  -- Get quota configuration
  SELECT limit_value, staging_multiplier
  INTO v_limit, v_multiplier
  FROM public.admin_quota_config
  WHERE role = v_user_role
    AND quota_type = p_quota_type;

  IF v_limit IS NULL THEN
    -- No quota configured for this role/type, allow (no limit)
    RETURN QUERY SELECT true, 0, 0, 0;
    RETURN;
  END IF;

  -- Calculate effective limit (apply staging multiplier if staging)
  IF p_is_staging THEN
    v_effective_limit := FLOOR(v_limit * v_multiplier);
  ELSE
    v_effective_limit := v_limit;
  END IF;

  -- Count usage based on quota type
  -- Note: This uses anonymized user_id from admin tables
  -- For rate_limit_tracking, we use actual user_id
  IF p_quota_type = 'uploads_per_day' THEN
    SELECT COUNT(*) INTO v_used_count
    FROM public.admin_upload_logs
    WHERE user_id = encode(digest(p_user_id::text, 'sha256'), 'hex')
      AND DATE(created_at) = CURRENT_DATE
      AND status = 'success';
  ELSIF p_quota_type = 'api_calls_per_hour' THEN
    SELECT COUNT(*) INTO v_used_count
    FROM public.admin_metrics
    WHERE user_id = encode(digest(p_user_id::text, 'sha256'), 'hex')
      AND metric_type = 'api_call'
      AND created_at >= NOW() - INTERVAL '1 hour';
  ELSIF p_quota_type = 'messages_per_minute' THEN
    SELECT COUNT(*) INTO v_used_count
    FROM public.rate_limit_tracking
    WHERE user_id = p_user_id
      AND action_type = 'message'
      AND created_at >= NOW() - INTERVAL '1 minute';
  ELSIF p_quota_type = 'invites_per_day' THEN
    SELECT COUNT(*) INTO v_used_count
    FROM public.rate_limit_tracking
    WHERE user_id = p_user_id
      AND action_type = 'invite'
      AND DATE(created_at) = CURRENT_DATE;
  ELSE
    -- Unknown quota type, allow
    RETURN QUERY SELECT true, v_effective_limit, 0, v_effective_limit;
    RETURN;
  END IF;

  -- Calculate remaining
  v_remaining := GREATEST(0, v_effective_limit - v_used_count);

  -- Return result
  RETURN QUERY SELECT
    v_remaining > 0 AS has_quota,
    v_effective_limit AS limit_value,
    v_used_count AS used_count,
    v_remaining AS remaining;
END;
$$;


ALTER FUNCTION "public"."check_quota"("p_user_id" "uuid", "p_quota_type" "text", "p_is_staging" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_quota"("p_user_id" "uuid", "p_quota_type" "text", "p_is_staging" boolean) IS 'Check if user has remaining quota for given quota type. Returns has_quota, limit_value, used_count, and remaining.';



CREATE OR REPLACE FUNCTION "public"."create_message_notifications"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."create_message_notifications"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_message_notifications"() IS 'Creates notifications for message recipients (tenant and/or landlord, excluding sender)';



CREATE OR REPLACE FUNCTION "public"."create_system_message"("p_lease_id" "uuid", "p_body" "text", "p_intent" "text" DEFAULT 'notice'::"text", "p_status" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."create_system_message"("p_lease_id" "uuid", "p_body" "text", "p_intent" "text", "p_status" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_system_message"("p_lease_id" "uuid", "p_body" "text", "p_intent" "text", "p_status" "text") IS 'Helper function to create system-generated messages. Used by application code or other triggers.';



CREATE OR REPLACE FUNCTION "public"."enforce_daily_upload_cap"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE uploads_today INTEGER; max_uploads INTEGER := 50;
BEGIN
  SELECT COUNT(*) INTO uploads_today FROM public.documents WHERE uploaded_by = NEW.uploaded_by AND DATE(created_at) = CURRENT_DATE;
  IF uploads_today >= max_uploads THEN RAISE EXCEPTION 'Daily upload limit of % reached. Please try again tomorrow.', max_uploads; END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_daily_upload_cap"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_invite_cap"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE active_invite_count INTEGER; max_active_invites INTEGER := 5;
BEGIN
  SELECT COUNT(*) INTO active_invite_count FROM public.tenant_invites
  WHERE property_id = NEW.property_id AND (accepted_at IS NULL OR status = 'pending') AND expires_at > NOW();
  IF active_invite_count >= max_active_invites THEN
    RAISE EXCEPTION 'Maximum % active invites per property. Please wait for existing invites to be accepted or expire.', max_active_invites;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_invite_cap"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_quota"("p_user_id" "uuid", "p_quota_type" "text", "p_is_staging" boolean DEFAULT false) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Check quota
  SELECT * INTO v_result
  FROM public.check_quota(p_user_id, p_quota_type, p_is_staging)
  LIMIT 1;

  -- If no quota remaining, raise exception
  IF NOT v_result.has_quota THEN
    RAISE EXCEPTION 'Quota exceeded for %: %/% used. Limit: %. Remaining: %.',
      p_quota_type,
      v_result.used_count,
      v_result.limit_value,
      v_result.limit_value,
      v_result.remaining;
  END IF;

  -- Return remaining quota
  RETURN v_result.remaining;
END;
$$;


ALTER FUNCTION "public"."enforce_quota"("p_user_id" "uuid", "p_quota_type" "text", "p_is_staging" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."enforce_quota"("p_user_id" "uuid", "p_quota_type" "text", "p_is_staging" boolean) IS 'Enforce quota before operation. Raises exception if quota exceeded, otherwise returns remaining quota.';



CREATE OR REPLACE FUNCTION "public"."ensure_landlord_organization"("owner_user_id" "uuid", "org_name" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."ensure_landlord_organization"("owner_user_id" "uuid", "org_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_organization_by_owner"("owner_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_organization_by_owner"("owner_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_organization_landlord_count"("org_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  landlord_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO landlord_count
  FROM public.memberships
  WHERE organization_id = org_id
    AND role IN ('owner', 'collaborator');
  
  RETURN landlord_count;
END;
$$;


ALTER FUNCTION "public"."get_organization_landlord_count"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_property_organization_id"("p_property_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ DECLARE v_organization_id UUID; BEGIN SELECT organization_id INTO v_organization_id FROM public.properties WHERE id = p_property_id; RETURN v_organization_id; END; $$;


ALTER FUNCTION "public"."get_property_organization_id"("p_property_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_table_columns"("p_table_name" "text") RETURNS TABLE("column_name" "text")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT column_name::TEXT
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = p_table_name
  ORDER BY ordinal_position;
$$;


ALTER FUNCTION "public"."get_table_columns"("p_table_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_organizations"("user_id_param" "uuid", "role_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("organization_id" "uuid", "organization_name" "text", "role" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_user_organizations"("user_id_param" "uuid", "role_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'tenant')
  ON CONFLICT (id) DO UPDATE SET email = NEW.email;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_newsletter_clicked"("campaign_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE newsletter_campaigns
  SET clicked_count = clicked_count + 1
  WHERE id = campaign_id;
END;
$$;


ALTER FUNCTION "public"."increment_newsletter_clicked"("campaign_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_newsletter_clicked"("campaign_id" "uuid") IS 'Increments the clicked_count for a newsletter campaign when a link is clicked';



CREATE OR REPLACE FUNCTION "public"."increment_newsletter_opened"("campaign_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE newsletter_campaigns
  SET opened_count = opened_count + 1
  WHERE id = campaign_id;
END;
$$;


ALTER FUNCTION "public"."increment_newsletter_opened"("campaign_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_newsletter_opened"("campaign_id" "uuid") IS 'Increments the opened_count for a newsletter campaign when a tracking pixel is loaded';



CREATE OR REPLACE FUNCTION "public"."is_admin_user"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;


ALTER FUNCTION "public"."is_admin_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_admin_user"() IS 'Helper function to check if current user is admin. Uses SECURITY DEFINER to bypass RLS and avoid recursion when checking admin role in RLS policies.';



CREATE OR REPLACE FUNCTION "public"."is_lease_active"("lease_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  end_date DATE;
BEGIN
  SELECT lease_end_date INTO end_date
  FROM public.leases
  WHERE id = lease_uuid;

  RETURN end_date IS NULL OR end_date > CURRENT_DATE;
END;
$$;


ALTER FUNCTION "public"."is_lease_active"("lease_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_lease_active"("lease_uuid" "uuid") IS 'Returns true if lease is active (no end date or end date in future)';



CREATE OR REPLACE FUNCTION "public"."prevent_ended_lease_updates"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF OLD.status = 'ended' THEN
    IF NEW.status != OLD.status OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR NEW.property_id IS DISTINCT FROM OLD.property_id OR NEW.lease_start_date IS DISTINCT FROM OLD.lease_start_date OR NEW.lease_end_date IS DISTINCT FROM OLD.lease_end_date OR NEW.lease_type IS DISTINCT FROM OLD.lease_type OR NEW.rent_amount IS DISTINCT FROM OLD.rent_amount OR NEW.rent_frequency IS DISTINCT FROM OLD.rent_frequency OR NEW.security_deposit IS DISTINCT FROM OLD.security_deposit THEN
      RAISE EXCEPTION 'Lease has ended and cannot be modified. Ended leases are immutable.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_ended_lease_updates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_ended_status_transitions"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF OLD.status = 'ended' AND NEW.status != 'ended' THEN
    RAISE EXCEPTION 'Cannot change status from ended. Ended leases are terminal and immutable.';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_ended_status_transitions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_expenses_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_expenses_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_leases_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_leases_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_notes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_notes_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_receipt_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_receipt_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tasks_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_tasks_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_access_property"("p_property_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE v_organization_id UUID; v_owner_id UUID;
BEGIN
  SELECT organization_id, owner_id INTO v_organization_id, v_owner_id FROM public.properties WHERE id = p_property_id;
  IF v_organization_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.memberships WHERE organization_id = v_organization_id AND user_id = p_user_id AND role IN ('owner', 'collaborator')) THEN RETURN TRUE; END IF;
  IF v_owner_id = p_user_id THEN RETURN TRUE; END IF;
  RETURN FALSE;
END; $$;


ALTER FUNCTION "public"."user_can_access_property"("p_property_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_membership_in_org"("p_organization_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM public.memberships WHERE organization_id = p_organization_id AND user_id = p_user_id); END; $$;


ALTER FUNCTION "public"."user_has_membership_in_org"("p_organization_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_is_landlord_in_org"("p_organization_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM public.memberships WHERE organization_id = p_organization_id AND user_id = p_user_id AND role IN ('owner', 'collaborator')); END; $$;


ALTER FUNCTION "public"."user_is_landlord_in_org"("p_organization_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_is_owner_of_org"("p_organization_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM public.memberships WHERE organization_id = p_organization_id AND user_id = p_user_id AND role = 'owner'); END; $$;


ALTER FUNCTION "public"."user_is_owner_of_org"("p_organization_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_is_tenant_in_household"("p_household_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM public.tenants WHERE household_id = p_household_id AND user_id = p_user_id); END; $$;


ALTER FUNCTION "public"."user_is_tenant_in_household"("p_household_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_is_tenant_of_property"("property_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenants
    WHERE property_id = property_uuid AND user_id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."user_is_tenant_of_property"("property_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_owns_property"("property_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = property_uuid AND owner_id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."user_owns_property"("property_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_tenant_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.properties WHERE id = NEW.property_id AND (owner_id = auth.uid() OR organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND role IN ('owner', 'collaborator')))) THEN
    RAISE EXCEPTION 'You do not have permission to assign tenants to this property';
  END IF;
  RETURN NEW;
END; $$;


ALTER FUNCTION "public"."validate_tenant_assignment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_work_order_ownership"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ BEGIN
  IF NEW.created_by_role = 'landlord' AND NOT EXISTS (SELECT 1 FROM public.properties WHERE id = NEW.property_id AND (owner_id = auth.uid() OR organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND role IN ('owner', 'collaborator')))) THEN
    RAISE EXCEPTION 'You do not have permission to create work orders for this property';
  ELSIF NEW.created_by_role = 'tenant' AND NOT EXISTS (SELECT 1 FROM public.tenants WHERE user_id = auth.uid() AND property_id = NEW.property_id) THEN
    RAISE EXCEPTION 'You can only create work orders for properties you are assigned to';
  END IF;
  RETURN NEW;
END; $$;


ALTER FUNCTION "public"."validate_work_order_ownership"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."abuse_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "violation_type" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "rate_limit_violation" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "abuse_events_action_type_check" CHECK (("action_type" = ANY (ARRAY['upload'::"text", 'message'::"text", 'invite'::"text", 'work_order'::"text", 'checklist'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."abuse_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "user_role" "text" NOT NULL,
    "metric_type" "text" NOT NULL,
    "page_path" "text",
    "metric_name" "text" NOT NULL,
    "duration_ms" integer NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admin_metrics_metric_type_check" CHECK (("metric_type" = ANY (ARRAY['page_load'::"text", 'api_call'::"text", 'component_render'::"text"]))),
    CONSTRAINT "admin_metrics_user_role_check" CHECK (("user_role" = ANY (ARRAY['tenant'::"text", 'landlord'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."admin_metrics" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_metrics" IS 'Performance metrics tracking for admin monitoring. Stores anonymized page load times, API call durations, and component render times.';



CREATE TABLE IF NOT EXISTS "public"."admin_quota_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role" "text" NOT NULL,
    "quota_type" "text" NOT NULL,
    "limit_value" integer NOT NULL,
    "staging_multiplier" numeric(3,2) DEFAULT 2.0,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admin_quota_config_quota_type_check" CHECK (("quota_type" = ANY (ARRAY['uploads_per_day'::"text", 'api_calls_per_hour'::"text", 'messages_per_minute'::"text", 'invites_per_day'::"text"]))),
    CONSTRAINT "admin_quota_config_role_check" CHECK (("role" = ANY (ARRAY['tenant'::"text", 'landlord'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."admin_quota_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_quota_config" IS 'Configurable quota limits per user role. Admins can update limits via SQL. Staging multiplier allows higher limits for testing environments.';



CREATE TABLE IF NOT EXISTS "public"."admin_security_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text",
    "user_role" "text",
    "event_type" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admin_security_logs_event_type_check" CHECK (("event_type" = ANY (ARRAY['failed_login'::"text", 'invalid_api_call'::"text", 'rate_limit_exceeded'::"text", 'suspicious_activity'::"text"]))),
    CONSTRAINT "admin_security_logs_severity_check" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text"]))),
    CONSTRAINT "admin_security_logs_user_role_check" CHECK (("user_role" = ANY (ARRAY['tenant'::"text", 'landlord'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."admin_security_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_security_logs" IS 'Security events tracking for admin monitoring. Stores anonymized security logs including failed logins, invalid API calls, rate limit violations, and suspicious activity.';



CREATE TABLE IF NOT EXISTS "public"."admin_upload_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "user_role" "text" NOT NULL,
    "bucket" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size_bytes" bigint NOT NULL,
    "file_type" "text" NOT NULL,
    "upload_duration_ms" integer,
    "status" "text" NOT NULL,
    "error_message" "text",
    "storage_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admin_upload_logs_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'failed'::"text"]))),
    CONSTRAINT "admin_upload_logs_user_role_check" CHECK (("user_role" = ANY (ARRAY['tenant'::"text", 'landlord'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."admin_upload_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_upload_logs" IS 'File upload tracking for admin monitoring. Stores anonymized upload logs including file size, type, duration, and success/failure status.';



CREATE TABLE IF NOT EXISTS "public"."app_releases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "version" "text" NOT NULL,
    "codename" "text",
    "commit_hash" "text" NOT NULL,
    "deployed_at" timestamp with time zone NOT NULL,
    "deployed_by" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "release_notes" "text",
    "is_active" boolean DEFAULT false NOT NULL,
    "environment" "text" DEFAULT 'production'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "app_releases_environment_check" CHECK (("environment" = ANY (ARRAY['staging'::"text", 'production'::"text"]))),
    CONSTRAINT "app_releases_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'rolled_back'::"text", 'pending'::"text", 'superseded'::"text"])))
);


ALTER TABLE "public"."app_releases" OWNER TO "postgres";


COMMENT ON TABLE "public"."app_releases" IS 'Tracks application releases with version numbers, deployment timestamps, and status. Supports staging and production environments.';



CREATE TABLE IF NOT EXISTS "public"."compliance_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action" "text" NOT NULL,
    "user_id" "uuid",
    "actor_id" "uuid",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."compliance_audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."compliance_audit_log" IS 'Immutable audit trail for all compliance-related actions (deletions, exports, consent updates).';



CREATE TABLE IF NOT EXISTS "public"."data_deletion_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "approved_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reason" "text",
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "data_deletion_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."data_deletion_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."data_deletion_requests" IS 'GDPR/CCPA right-to-delete requests. Supports soft delete with 30-day retention period.';



CREATE TABLE IF NOT EXISTS "public"."data_export_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "generated_at" timestamp with time zone,
    "download_url" "text",
    "expires_at" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "data_export_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'generating'::"text", 'ready'::"text", 'expired'::"text", 'downloaded'::"text"])))
);


ALTER TABLE "public"."data_export_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."data_export_requests" IS 'GDPR/CCPA right-to-export requests. Generates ZIP file with all user data.';



CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "lease_id" "uuid"
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "notification_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "to_email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "postal_message_id" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "bounced_at" timestamp with time zone,
    "failed_at" timestamp with time zone,
    "error_message" "text",
    "retry_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "email_deliveries_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'delivered'::"text", 'bounced'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."email_deliveries" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_deliveries" IS 'Tracks email delivery status from Postal. Links to notifications for audit trail.';



CREATE TABLE IF NOT EXISTS "public"."email_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email_notifications_enabled" boolean DEFAULT true NOT NULL,
    "email_digest_enabled" boolean DEFAULT true NOT NULL,
    "email_marketing_enabled" boolean DEFAULT false NOT NULL,
    "opted_out_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_preferences" IS 'User email notification preferences. Respects opt-out for GDPR/CCPA compliance.';



CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "date" "date" NOT NULL,
    "category" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_recurring" boolean DEFAULT false,
    "recurring_frequency" "text",
    "recurring_start_date" "date",
    "recurring_end_date" "date",
    CONSTRAINT "expenses_category_check" CHECK (("category" = ANY (ARRAY['maintenance'::"text", 'utilities'::"text", 'repairs'::"text"]))),
    CONSTRAINT "expenses_recurring_frequency_check" CHECK (("recurring_frequency" = ANY (ARRAY['monthly'::"text", 'quarterly'::"text", 'yearly'::"text"])))
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


COMMENT ON COLUMN "public"."expenses"."is_recurring" IS 'Whether this expense recurs on a schedule';



COMMENT ON COLUMN "public"."expenses"."recurring_frequency" IS 'Frequency of recurrence: monthly, quarterly, or yearly';



COMMENT ON COLUMN "public"."expenses"."recurring_start_date" IS 'Date when recurring expense starts';



COMMENT ON COLUMN "public"."expenses"."recurring_end_date" IS 'Optional date when recurring expense ends (NULL means ongoing)';



CREATE TABLE IF NOT EXISTS "public"."feature_flags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "scope" "text" DEFAULT 'global'::"text" NOT NULL,
    "release_id" "uuid",
    "default_value" boolean DEFAULT false NOT NULL,
    "description" "text",
    "environment" "text" DEFAULT 'production'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "feature_flags_environment_check" CHECK (("environment" = ANY (ARRAY['staging'::"text", 'production'::"text"]))),
    CONSTRAINT "feature_flags_scope_check" CHECK (("scope" = ANY (ARRAY['global'::"text", 'user'::"text", 'organization'::"text", 'property'::"text"])))
);


ALTER TABLE "public"."feature_flags" OWNER TO "postgres";


COMMENT ON TABLE "public"."feature_flags" IS 'Feature flags for runtime feature toggling. Scoped by environment (staging vs production).';



CREATE TABLE IF NOT EXISTS "public"."households" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."households" OWNER TO "postgres";


COMMENT ON TABLE "public"."households" IS 'Tenant grouping. Multiple tenant users can belong to one household (e.g., spouses, roommates). Households are linked to properties. Tenant accounts persist even after move-out (household unlinked from property).';



CREATE TABLE IF NOT EXISTS "public"."lead_field_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "source_type" "text" NOT NULL,
    "mapping" "jsonb" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lead_field_mappings" OWNER TO "postgres";


COMMENT ON TABLE "public"."lead_field_mappings" IS 'Saved field mapping templates for manual uploads. Allows reusing mappings for consistent imports.';



CREATE TABLE IF NOT EXISTS "public"."lead_import_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source" "text" NOT NULL,
    "file_name" "text",
    "file_type" "text",
    "rows_processed" integer DEFAULT 0 NOT NULL,
    "rows_imported" integer DEFAULT 0 NOT NULL,
    "rows_duplicates" integer DEFAULT 0 NOT NULL,
    "rows_errors" integer DEFAULT 0 NOT NULL,
    "actor" "uuid" NOT NULL,
    "environment" "text" DEFAULT 'production'::"text" NOT NULL,
    "sandbox_mode" boolean DEFAULT false NOT NULL,
    "field_mapping" "jsonb",
    "import_settings" "jsonb",
    "error_log" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    CONSTRAINT "lead_import_events_environment_check" CHECK (("environment" = ANY (ARRAY['staging'::"text", 'production'::"text"])))
);


ALTER TABLE "public"."lead_import_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."lead_import_events" IS 'Tracks all lead import operations (manual uploads, scraper imports, API imports). Provides audit trail and error tracking.';



CREATE TABLE IF NOT EXISTS "public"."leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "phone" "text",
    "company" "text",
    "source" "text" NOT NULL,
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "icp_tags" "jsonb",
    "imported_at" timestamp with time zone DEFAULT "now"(),
    "uploaded_by" "uuid",
    "dedupe_hash" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "import_event_id" "uuid",
    "opt_in_status" "text" DEFAULT 'unknown'::"text",
    "normalized_email" "text",
    "normalized_phone" "text",
    CONSTRAINT "leads_opt_in_status_check" CHECK (("opt_in_status" = ANY (ARRAY['opted_in'::"text", 'opted_out'::"text", 'pending'::"text", 'unknown'::"text"]))),
    CONSTRAINT "leads_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'contacted'::"text", 'qualified'::"text", 'converted'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."leads" OWNER TO "postgres";


COMMENT ON TABLE "public"."leads" IS 'Lead ingestion system. Tracks potential customers from various sources.';



CREATE TABLE IF NOT EXISTS "public"."leases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "tenant_id" "uuid",
    "lease_start_date" "date",
    "lease_end_date" "date",
    "lease_type" "text" DEFAULT 'long-term'::"text" NOT NULL,
    "rent_amount" numeric(10,2),
    "rent_frequency" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "security_deposit" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "unit_id" "uuid" NOT NULL,
    CONSTRAINT "leases_lease_type_check" CHECK (("lease_type" = ANY (ARRAY['short-term'::"text", 'long-term'::"text"]))),
    CONSTRAINT "leases_rent_frequency_check" CHECK (("rent_frequency" = ANY (ARRAY['monthly'::"text", 'weekly'::"text", 'biweekly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "leases_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'ended'::"text"])))
);


ALTER TABLE "public"."leases" OWNER TO "postgres";


COMMENT ON TABLE "public"."leases" IS 'Lease metadata (descriptive only, not legal documents). Leases belong to units within properties. Supports lease history with multiple leases per unit over time.';



CREATE TABLE IF NOT EXISTS "public"."maintenance_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid",
    "tenant_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "category" "text",
    "description" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "image_urls" "jsonb" DEFAULT '[]'::"jsonb",
    "lease_id" "uuid",
    "created_by" "uuid",
    "created_by_role" "text" NOT NULL,
    "scheduled_date" timestamp with time zone,
    "visibility_to_tenants" boolean DEFAULT true,
    "internal_notes" "text",
    "public_description" "text",
    CONSTRAINT "maintenance_requests_created_by_role_check" CHECK (("created_by_role" = ANY (ARRAY['landlord'::"text", 'tenant'::"text"]))),
    CONSTRAINT "maintenance_requests_status_check" CHECK (("status" = ANY (ARRAY['submitted'::"text", 'seen'::"text", 'scheduled'::"text", 'in_progress'::"text", 'resolved'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."maintenance_requests" OWNER TO "postgres";


COMMENT ON COLUMN "public"."maintenance_requests"."image_urls" IS 'Array of image URLs uploaded with the maintenance request. Stored as JSONB array of strings.';



CREATE TABLE IF NOT EXISTS "public"."memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "memberships_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'collaborator'::"text", 'tenant'::"text"])))
);


ALTER TABLE "public"."memberships" OWNER TO "postgres";


COMMENT ON TABLE "public"."memberships" IS 'User-organization relationships with roles. Roles: owner (full access), collaborator (Pro plan only, limited access), tenant (read-only access to linked properties).';



CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lease_id" "uuid" NOT NULL,
    "sender_id" "uuid",
    "sender_role" "text" NOT NULL,
    "body" "text" NOT NULL,
    "intent" "text" DEFAULT 'general'::"text" NOT NULL,
    "status" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "soft_deleted_at" timestamp with time zone,
    "message_type" "text" DEFAULT 'landlord_tenant'::"text" NOT NULL,
    CONSTRAINT "messages_intent_check" CHECK (("intent" = ANY (ARRAY['general'::"text", 'maintenance'::"text", 'billing'::"text", 'notice'::"text"]))),
    CONSTRAINT "messages_message_type_check" CHECK (("message_type" = ANY (ARRAY['landlord_tenant'::"text", 'household'::"text"]))),
    CONSTRAINT "messages_sender_role_check" CHECK (("sender_role" = ANY (ARRAY['tenant'::"text", 'landlord'::"text", 'system'::"text"]))),
    CONSTRAINT "messages_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'acknowledged'::"text", 'resolved'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."messages" IS 'Lease-scoped messages with explicit message types. landlord_tenant: landlord + all tenants on lease. household: tenants only (no landlord). Messages are immutable. Use soft_deleted_at for removal.';



CREATE TABLE IF NOT EXISTS "public"."newsletter_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject" "text" NOT NULL,
    "content" "text" NOT NULL,
    "topic" "text",
    "style_preset" "text",
    "sent_at" timestamp with time zone,
    "recipients_count" integer DEFAULT 0 NOT NULL,
    "opened_count" integer DEFAULT 0 NOT NULL,
    "clicked_count" integer DEFAULT 0 NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."newsletter_campaigns" OWNER TO "postgres";


COMMENT ON TABLE "public"."newsletter_campaigns" IS 'Newsletter campaigns sent to users and leads.';



CREATE TABLE IF NOT EXISTS "public"."notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notes_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['property'::"text", 'unit'::"text", 'tenant'::"text", 'rent_record'::"text", 'expense'::"text", 'work_order'::"text", 'document'::"text"])))
);


ALTER TABLE "public"."notes" OWNER TO "postgres";


COMMENT ON TABLE "public"."notes" IS 'Polymorphic notes system. Notes can be attached to properties, units, tenants, rent records, expenses, work orders, or documents. Markdown formatting supported.';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lease_id" "uuid" NOT NULL,
    "type" "text" DEFAULT 'message'::"text" NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "email_sent_at" timestamp with time zone,
    "email_delivered_at" timestamp with time zone,
    "email_failed_at" timestamp with time zone,
    "email_error" "text",
    "push_sent_at" timestamp with time zone,
    "push_delivered_at" timestamp with time zone,
    "push_failed_at" timestamp with time zone,
    "push_error" "text",
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['message'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'Notifications for new messages. Email notifications deferred to post-MVP (digestible format).';



CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON TABLE "public"."organizations" IS 'Landlord workspaces. Each organization represents a landlord account/workspace that owns properties and subscriptions. Organizations are auto-created on first landlord access.';



CREATE TABLE IF NOT EXISTS "public"."payment_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid",
    "refunds_enabled" boolean DEFAULT true NOT NULL,
    "grace_period_days" integer DEFAULT 5 NOT NULL,
    "auto_withdraw_enabled" boolean DEFAULT false NOT NULL,
    "withdraw_schedule" "text" DEFAULT 'manual'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payment_settings_withdraw_schedule_check" CHECK (("withdraw_schedule" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."payment_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_settings" IS 'Configurable payment settings per property (refunds, grace periods, withdrawal schedules).';



CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_intent_id" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "fees" numeric(10,2) DEFAULT 0 NOT NULL,
    "net_amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'usd'::"text" NOT NULL,
    "lease_id" "uuid",
    "tenant_id" "uuid",
    "property_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'succeeded'::"text", 'failed'::"text", 'canceled'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


COMMENT ON TABLE "public"."payments" IS 'Payment records from Stripe. Tracks payment intents, status, fees, and net amounts.';



CREATE TABLE IF NOT EXISTS "public"."promo_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "type" "text" NOT NULL,
    "value" numeric(10,2) NOT NULL,
    "usage_limit" integer,
    "usage_count" integer DEFAULT 0 NOT NULL,
    "expires_at" timestamp with time zone,
    "description" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "promo_codes_type_check" CHECK (("type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text", 'trial_extension'::"text"])))
);


ALTER TABLE "public"."promo_codes" OWNER TO "postgres";


COMMENT ON TABLE "public"."promo_codes" IS 'Promotional codes for discounts and trial extensions.';



CREATE TABLE IF NOT EXISTS "public"."properties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "rent_amount" numeric(10,2) NOT NULL,
    "rent_due_date" integer,
    "rules" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "property_type" "text",
    "late_fee_rules" "jsonb",
    "rules_visible_to_tenants" boolean DEFAULT false,
    CONSTRAINT "properties_rent_due_date_check" CHECK ((("rent_due_date" >= 1) AND ("rent_due_date" <= 31)))
);


ALTER TABLE "public"."properties" OWNER TO "postgres";


COMMENT ON COLUMN "public"."properties"."organization_id" IS 'Organization that owns this property. Properties belong to organizations, not individual users. Migrated from owner_id during lazy migration.';



COMMENT ON COLUMN "public"."properties"."is_active" IS 'Whether the property is active. Inactive properties are excluded from calculations, metrics, and most views. Defaults to true.';



CREATE TABLE IF NOT EXISTS "public"."property_group_assignments" (
    "property_id" "uuid" NOT NULL,
    "group_id" "uuid" NOT NULL
);


ALTER TABLE "public"."property_group_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" DEFAULT 'custom'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "property_groups_type_check" CHECK (("type" = ANY (ARRAY['city'::"text", 'ownership'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."property_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."push_subscriptions" IS 'Stores VAPID push notification subscriptions for web push. Each user can have multiple subscriptions (different devices/browsers).';



CREATE TABLE IF NOT EXISTS "public"."rate_limit_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "rate_limit_tracking_action_type_check" CHECK (("action_type" = ANY (ARRAY['upload'::"text", 'message'::"text", 'invite'::"text", 'work_order'::"text", 'checklist'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."rate_limit_tracking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."receipt_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "header_text" "text",
    "logo_url" "text",
    "footer_note" "text",
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "date_format" "text" DEFAULT 'MM/DD/YYYY'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."receipt_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."release_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "release_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "actor" "uuid" NOT NULL,
    "reason" "text",
    "metadata" "jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "environment" "text" DEFAULT 'production'::"text" NOT NULL,
    CONSTRAINT "release_events_action_check" CHECK (("action" = ANY (ARRAY['deploy'::"text", 'rollback'::"text", 'manual_override'::"text", 'feature_flag_change'::"text"]))),
    CONSTRAINT "release_events_environment_check" CHECK (("environment" = ANY (ARRAY['staging'::"text", 'production'::"text"])))
);


ALTER TABLE "public"."release_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."release_events" IS 'Immutable audit trail for all release-related actions (deploy, rollback, manual override, feature flag changes).';



CREATE TABLE IF NOT EXISTS "public"."rent_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid",
    "tenant_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "due_date" "date" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "paid_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "late_fee" numeric(10,2) DEFAULT 0 NOT NULL,
    "lease_id" "uuid",
    "stripe_payment_intent_id" "text",
    "payment_status" "text" DEFAULT 'pending'::"text",
    "paid_at" timestamp with time zone,
    "payment_method" "text",
    "notes" "text",
    "receipt_url" "text",
    "payment_method_type" "text",
    "payment_method_label" "text",
    CONSTRAINT "rent_records_payment_method_type_check" CHECK (("payment_method_type" = ANY (ARRAY['manual'::"text", 'external'::"text"]))),
    CONSTRAINT "rent_records_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'overdue'::"text", 'failed'::"text"]))),
    CONSTRAINT "rent_records_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'overdue'::"text"])))
);


ALTER TABLE "public"."rent_records" OWNER TO "postgres";


COMMENT ON COLUMN "public"."rent_records"."late_fee" IS 'Late fee amount (manually applied in MVP, no automation)';



COMMENT ON COLUMN "public"."rent_records"."lease_id" IS 'Lease-scoped rent record. Required for new records. Property/tenant_id kept for backward compatibility during migration.';



CREATE TABLE IF NOT EXISTS "public"."scraper_kill_switch" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "last_checked_at" timestamp with time zone DEFAULT "now"(),
    "reason" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."scraper_kill_switch" OWNER TO "postgres";


COMMENT ON TABLE "public"."scraper_kill_switch" IS 'Kill switch for scraper. When enabled=true, scraper stops all operations immediately.';



CREATE TABLE IF NOT EXISTS "public"."scraper_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "ended_at" timestamp with time zone,
    "leads_found" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'running'::"text" NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "scraper_runs_status_check" CHECK (("status" = ANY (ARRAY['running'::"text", 'completed'::"text", 'failed'::"text", 'killed'::"text"])))
);


ALTER TABLE "public"."scraper_runs" OWNER TO "postgres";


COMMENT ON TABLE "public"."scraper_runs" IS 'Tracks scraper execution runs. Used for monitoring and audit.';



CREATE TABLE IF NOT EXISTS "public"."stripe_connect_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "text" NOT NULL,
    "onboarding_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "property_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "stripe_connect_accounts_onboarding_status_check" CHECK (("onboarding_status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'complete'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."stripe_connect_accounts" OWNER TO "postgres";


COMMENT ON TABLE "public"."stripe_connect_accounts" IS 'Stripe Connect accounts for property-scoped payment processing. Links landlords to Stripe for rent collection.';



CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "plan" "text" DEFAULT 'free'::"text" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "status" "text" DEFAULT 'active'::"text",
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "subscriptions_plan_check" CHECK (("plan" = ANY (ARRAY['free'::"text", 'pro'::"text"]))),
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'canceled'::"text", 'past_due'::"text", 'trialing'::"text", 'incomplete'::"text", 'incomplete_expired'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."subscriptions" IS 'Organization-level subscriptions. Each organization has one subscription. Pro plan enables collaborator invites (hard cap of 2 landlord-side users: owner + 1 collaborator).';



CREATE TABLE IF NOT EXISTS "public"."support_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    CONSTRAINT "support_tickets_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'resolved'::"text"])))
);


ALTER TABLE "public"."support_tickets" OWNER TO "postgres";


COMMENT ON TABLE "public"."support_tickets" IS 'Lightweight support ticket system. Users can create tickets, admins can view and mark as resolved. No assignments, comments, priorities, or automations.';



CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "assigned_to_type" "text" NOT NULL,
    "assigned_to_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "deadline" "date",
    "linked_context_type" "text" NOT NULL,
    "linked_context_id" "uuid" NOT NULL,
    "checklist_items" "jsonb" DEFAULT '[]'::"jsonb",
    "image_urls" "jsonb" DEFAULT '[]'::"jsonb",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tasks_assigned_to_type_check" CHECK (("assigned_to_type" = ANY (ARRAY['tenant'::"text", 'household'::"text", 'unit'::"text"]))),
    CONSTRAINT "tasks_linked_context_type_check" CHECK (("linked_context_type" = ANY (ARRAY['work_order'::"text", 'move_in'::"text", 'property'::"text", 'rent_record'::"text"]))),
    CONSTRAINT "tasks_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."tasks" IS 'Polymorphic tasks system. Tasks can be assigned to tenants/households/units and linked to work orders, move-ins, properties, or rent records. Supports checklists and image uploads.';



CREATE TABLE IF NOT EXISTS "public"."tenant_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "token" "text" NOT NULL,
    "accepted_at" timestamp with time zone,
    "expires_at" timestamp with time zone NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "lease_id" "uuid"
);


ALTER TABLE "public"."tenant_invites" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenant_invites" IS 'Tenant invitation system. Landlords can generate invite links that tenants can accept to unlock tenant UI access.';



COMMENT ON COLUMN "public"."tenant_invites"."lease_id" IS 'Draft lease created automatically when invite is generated. Links invite to lease for tenant acceptance flow.';



CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "property_id" "uuid",
    "move_in_date" "date" NOT NULL,
    "lease_end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "household_id" "uuid",
    "lease_id" "uuid",
    "phone" "text",
    "notes" "text"
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tenants"."household_id" IS 'Household this tenant belongs to. Multiple tenant users can belong to one household. Migrated from direct property link during lazy migration.';



CREATE TABLE IF NOT EXISTS "public"."units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "unit_name" "text" NOT NULL,
    "rent_amount" numeric(10,2),
    "rent_due_date" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_property_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_property_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['landlord'::"text", 'tenant'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."role" IS 'User role: landlord, tenant, or admin. Admin role is set manually in database.';



CREATE TABLE IF NOT EXISTS "public"."waitlist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "source" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "converted_to_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "waitlist_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'invited'::"text", 'converted'::"text", 'removed'::"text"])))
);


ALTER TABLE "public"."waitlist" OWNER TO "postgres";


COMMENT ON TABLE "public"."waitlist" IS 'Waitlist for early access. Tracks signups before public launch.';



ALTER TABLE ONLY "public"."abuse_events"
    ADD CONSTRAINT "abuse_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_metrics"
    ADD CONSTRAINT "admin_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_quota_config"
    ADD CONSTRAINT "admin_quota_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_quota_config"
    ADD CONSTRAINT "admin_quota_config_role_quota_type_key" UNIQUE ("role", "quota_type");



ALTER TABLE ONLY "public"."admin_security_logs"
    ADD CONSTRAINT "admin_security_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_upload_logs"
    ADD CONSTRAINT "admin_upload_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_releases"
    ADD CONSTRAINT "app_releases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_releases"
    ADD CONSTRAINT "app_releases_version_key" UNIQUE ("version");



ALTER TABLE ONLY "public"."compliance_audit_log"
    ADD CONSTRAINT "compliance_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_deletion_requests"
    ADD CONSTRAINT "data_deletion_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_export_requests"
    ADD CONSTRAINT "data_export_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_deliveries"
    ADD CONSTRAINT "email_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_preferences"
    ADD CONSTRAINT "email_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_preferences"
    ADD CONSTRAINT "email_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "feature_flags_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."households"
    ADD CONSTRAINT "households_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_field_mappings"
    ADD CONSTRAINT "lead_field_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_import_events"
    ADD CONSTRAINT "lead_import_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leases"
    ADD CONSTRAINT "leases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."maintenance_requests"
    ADD CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."newsletter_campaigns"
    ADD CONSTRAINT "newsletter_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_settings"
    ADD CONSTRAINT "payment_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_settings"
    ADD CONSTRAINT "payment_settings_property_id_key" UNIQUE ("property_id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_payment_intent_id_key" UNIQUE ("payment_intent_id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_group_assignments"
    ADD CONSTRAINT "property_group_assignments_pkey" PRIMARY KEY ("property_id", "group_id");



ALTER TABLE ONLY "public"."property_groups"
    ADD CONSTRAINT "property_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE ("endpoint");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limit_tracking"
    ADD CONSTRAINT "rate_limit_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."receipt_settings"
    ADD CONSTRAINT "receipt_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."receipt_settings"
    ADD CONSTRAINT "receipt_settings_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."release_events"
    ADD CONSTRAINT "release_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rent_records"
    ADD CONSTRAINT "rent_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scraper_kill_switch"
    ADD CONSTRAINT "scraper_kill_switch_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scraper_runs"
    ADD CONSTRAINT "scraper_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_connect_accounts"
    ADD CONSTRAINT "stripe_connect_accounts_account_id_key" UNIQUE ("account_id");



ALTER TABLE ONLY "public"."stripe_connect_accounts"
    ADD CONSTRAINT "stripe_connect_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_organization_id_key" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_invites"
    ADD CONSTRAINT "tenant_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_invites"
    ADD CONSTRAINT "tenant_invites_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."units"
    ADD CONSTRAINT "units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."units"
    ADD CONSTRAINT "units_property_id_unit_name_key" UNIQUE ("property_id", "unit_name");



ALTER TABLE ONLY "public"."user_property_types"
    ADD CONSTRAINT "user_property_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_property_types"
    ADD CONSTRAINT "user_property_types_user_id_type_name_key" UNIQUE ("user_id", "type_name");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."waitlist"
    ADD CONSTRAINT "waitlist_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."waitlist"
    ADD CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_abuse_events_created_at" ON "public"."abuse_events" USING "btree" ("created_at");



CREATE INDEX "idx_abuse_events_user_id" ON "public"."abuse_events" USING "btree" ("user_id");



CREATE INDEX "idx_admin_metrics_created_at" ON "public"."admin_metrics" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_admin_metrics_metric_type" ON "public"."admin_metrics" USING "btree" ("metric_type");



CREATE INDEX "idx_admin_metrics_page_path" ON "public"."admin_metrics" USING "btree" ("page_path");



CREATE INDEX "idx_admin_metrics_type_created" ON "public"."admin_metrics" USING "btree" ("metric_type", "created_at" DESC);



CREATE INDEX "idx_admin_metrics_user_role" ON "public"."admin_metrics" USING "btree" ("user_role");



CREATE INDEX "idx_admin_quota_config_role_type" ON "public"."admin_quota_config" USING "btree" ("role", "quota_type");



CREATE INDEX "idx_admin_security_logs_created_at" ON "public"."admin_security_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_admin_security_logs_event_severity" ON "public"."admin_security_logs" USING "btree" ("event_type", "severity");



CREATE INDEX "idx_admin_security_logs_event_type" ON "public"."admin_security_logs" USING "btree" ("event_type");



CREATE INDEX "idx_admin_security_logs_severity" ON "public"."admin_security_logs" USING "btree" ("severity");



CREATE INDEX "idx_admin_security_logs_type_created" ON "public"."admin_security_logs" USING "btree" ("event_type", "created_at" DESC);



CREATE INDEX "idx_admin_upload_logs_bucket" ON "public"."admin_upload_logs" USING "btree" ("bucket");



CREATE INDEX "idx_admin_upload_logs_created_at" ON "public"."admin_upload_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_admin_upload_logs_status" ON "public"."admin_upload_logs" USING "btree" ("status");



CREATE INDEX "idx_admin_upload_logs_status_created" ON "public"."admin_upload_logs" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_admin_upload_logs_user_role" ON "public"."admin_upload_logs" USING "btree" ("user_role");



CREATE INDEX "idx_app_releases_environment" ON "public"."app_releases" USING "btree" ("environment");



CREATE INDEX "idx_app_releases_is_active" ON "public"."app_releases" USING "btree" ("is_active", "environment");



CREATE INDEX "idx_app_releases_status" ON "public"."app_releases" USING "btree" ("status");



CREATE INDEX "idx_app_releases_version" ON "public"."app_releases" USING "btree" ("version");



CREATE INDEX "idx_compliance_audit_log_action" ON "public"."compliance_audit_log" USING "btree" ("action");



CREATE INDEX "idx_compliance_audit_log_timestamp" ON "public"."compliance_audit_log" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_compliance_audit_log_user_id" ON "public"."compliance_audit_log" USING "btree" ("user_id");



CREATE INDEX "idx_data_deletion_requests_status" ON "public"."data_deletion_requests" USING "btree" ("status");



CREATE INDEX "idx_data_deletion_requests_user_id" ON "public"."data_deletion_requests" USING "btree" ("user_id");



CREATE INDEX "idx_data_export_requests_status" ON "public"."data_export_requests" USING "btree" ("status");



CREATE INDEX "idx_data_export_requests_user_id" ON "public"."data_export_requests" USING "btree" ("user_id");



CREATE INDEX "idx_documents_property_id" ON "public"."documents" USING "btree" ("property_id");



CREATE INDEX "idx_email_deliveries_notification_id" ON "public"."email_deliveries" USING "btree" ("notification_id");



CREATE INDEX "idx_email_deliveries_postal_message_id" ON "public"."email_deliveries" USING "btree" ("postal_message_id");



CREATE INDEX "idx_email_deliveries_status" ON "public"."email_deliveries" USING "btree" ("status");



CREATE INDEX "idx_email_deliveries_user_id" ON "public"."email_deliveries" USING "btree" ("user_id");



CREATE INDEX "idx_email_preferences_user_id" ON "public"."email_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_feature_flags_environment" ON "public"."feature_flags" USING "btree" ("environment");



CREATE INDEX "idx_feature_flags_key" ON "public"."feature_flags" USING "btree" ("key");



CREATE INDEX "idx_households_property_id" ON "public"."households" USING "btree" ("property_id");



CREATE INDEX "idx_lead_field_mappings_created_by" ON "public"."lead_field_mappings" USING "btree" ("created_by");



CREATE INDEX "idx_lead_import_events_actor" ON "public"."lead_import_events" USING "btree" ("actor");



CREATE INDEX "idx_lead_import_events_environment" ON "public"."lead_import_events" USING "btree" ("environment");



CREATE INDEX "idx_leads_dedupe_hash" ON "public"."leads" USING "btree" ("dedupe_hash");



CREATE INDEX "idx_leads_email" ON "public"."leads" USING "btree" ("email");



CREATE INDEX "idx_leads_import_event_id" ON "public"."leads" USING "btree" ("import_event_id");



CREATE INDEX "idx_leads_normalized_email" ON "public"."leads" USING "btree" ("normalized_email");



CREATE INDEX "idx_leads_normalized_phone" ON "public"."leads" USING "btree" ("normalized_phone");



CREATE INDEX "idx_leads_source" ON "public"."leads" USING "btree" ("source");



CREATE INDEX "idx_leads_status" ON "public"."leads" USING "btree" ("status");



CREATE INDEX "idx_leases_status" ON "public"."leases" USING "btree" ("status");



CREATE INDEX "idx_leases_status_tenant_id" ON "public"."leases" USING "btree" ("status", "tenant_id") WHERE ("tenant_id" IS NOT NULL);



CREATE INDEX "idx_leases_unit_id" ON "public"."leases" USING "btree" ("unit_id");



CREATE INDEX "idx_maintenance_requests_created_by_role" ON "public"."maintenance_requests" USING "btree" ("created_by_role");



CREATE INDEX "idx_maintenance_requests_image_urls" ON "public"."maintenance_requests" USING "gin" ("image_urls");



CREATE INDEX "idx_maintenance_requests_lease_id" ON "public"."maintenance_requests" USING "btree" ("lease_id");



CREATE INDEX "idx_maintenance_requests_property_id" ON "public"."maintenance_requests" USING "btree" ("property_id");



CREATE INDEX "idx_maintenance_requests_scheduled_date" ON "public"."maintenance_requests" USING "btree" ("scheduled_date");



CREATE INDEX "idx_maintenance_requests_status" ON "public"."maintenance_requests" USING "btree" ("status");



CREATE INDEX "idx_maintenance_requests_tenant_id" ON "public"."maintenance_requests" USING "btree" ("tenant_id");



CREATE INDEX "idx_maintenance_requests_visibility" ON "public"."maintenance_requests" USING "btree" ("visibility_to_tenants");



CREATE INDEX "idx_memberships_org_user" ON "public"."memberships" USING "btree" ("organization_id", "user_id");



CREATE INDEX "idx_memberships_organization_id" ON "public"."memberships" USING "btree" ("organization_id");



CREATE INDEX "idx_memberships_role" ON "public"."memberships" USING "btree" ("role");



CREATE INDEX "idx_memberships_user_id" ON "public"."memberships" USING "btree" ("user_id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at");



CREATE INDEX "idx_messages_lease_created" ON "public"."messages" USING "btree" ("lease_id", "created_at" DESC);



CREATE INDEX "idx_messages_lease_id" ON "public"."messages" USING "btree" ("lease_id");



CREATE INDEX "idx_messages_lease_type" ON "public"."messages" USING "btree" ("lease_id", "message_type");



CREATE INDEX "idx_messages_sender_id" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_messages_soft_deleted" ON "public"."messages" USING "btree" ("lease_id", "soft_deleted_at") WHERE ("soft_deleted_at" IS NULL);



CREATE INDEX "idx_newsletter_campaigns_sent_at" ON "public"."newsletter_campaigns" USING "btree" ("sent_at");



CREATE INDEX "idx_newsletter_campaigns_topic" ON "public"."newsletter_campaigns" USING "btree" ("topic");



CREATE INDEX "idx_notes_entity" ON "public"."notes" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_notes_user" ON "public"."notes" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_lease_id" ON "public"."notifications" USING "btree" ("lease_id");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_read" ON "public"."notifications" USING "btree" ("user_id", "read");



CREATE INDEX "idx_notifications_user_read_created" ON "public"."notifications" USING "btree" ("user_id", "read", "created_at" DESC);



CREATE INDEX "idx_organizations_created_at" ON "public"."organizations" USING "btree" ("created_at");



CREATE INDEX "idx_payment_settings_property_id" ON "public"."payment_settings" USING "btree" ("property_id");



CREATE INDEX "idx_payments_lease_id" ON "public"."payments" USING "btree" ("lease_id");



CREATE INDEX "idx_payments_payment_intent_id" ON "public"."payments" USING "btree" ("payment_intent_id");



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("status");



CREATE INDEX "idx_promo_codes_code" ON "public"."promo_codes" USING "btree" ("code");



CREATE INDEX "idx_promo_codes_expires_at" ON "public"."promo_codes" USING "btree" ("expires_at");



CREATE INDEX "idx_properties_is_active" ON "public"."properties" USING "btree" ("is_active");



CREATE INDEX "idx_properties_organization_id" ON "public"."properties" USING "btree" ("organization_id") WHERE ("organization_id" IS NOT NULL);



CREATE INDEX "idx_properties_owner_id" ON "public"."properties" USING "btree" ("owner_id");



CREATE INDEX "idx_push_subscriptions_endpoint" ON "public"."push_subscriptions" USING "btree" ("endpoint");



CREATE INDEX "idx_push_subscriptions_user_id" ON "public"."push_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_rate_limit_tracking_created_at" ON "public"."rate_limit_tracking" USING "btree" ("created_at");



CREATE INDEX "idx_rate_limit_tracking_user_id" ON "public"."rate_limit_tracking" USING "btree" ("user_id");



CREATE INDEX "idx_release_events_actor" ON "public"."release_events" USING "btree" ("actor");



CREATE INDEX "idx_release_events_release_id" ON "public"."release_events" USING "btree" ("release_id");



CREATE INDEX "idx_release_events_timestamp" ON "public"."release_events" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_rent_records_lease_id" ON "public"."rent_records" USING "btree" ("lease_id");



CREATE INDEX "idx_rent_records_property_id" ON "public"."rent_records" USING "btree" ("property_id");



CREATE INDEX "idx_rent_records_status" ON "public"."rent_records" USING "btree" ("status");



CREATE INDEX "idx_rent_records_tenant_id" ON "public"."rent_records" USING "btree" ("tenant_id");



CREATE INDEX "idx_scraper_runs_started_at" ON "public"."scraper_runs" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_scraper_runs_status" ON "public"."scraper_runs" USING "btree" ("status");



CREATE INDEX "idx_stripe_connect_accounts_account_id" ON "public"."stripe_connect_accounts" USING "btree" ("account_id");



CREATE INDEX "idx_stripe_connect_accounts_property_id" ON "public"."stripe_connect_accounts" USING "btree" ("property_id");



CREATE INDEX "idx_subscriptions_organization_id" ON "public"."subscriptions" USING "btree" ("organization_id");



CREATE INDEX "idx_subscriptions_plan" ON "public"."subscriptions" USING "btree" ("plan");



CREATE INDEX "idx_subscriptions_status" ON "public"."subscriptions" USING "btree" ("status");



CREATE INDEX "idx_subscriptions_stripe_customer_id" ON "public"."subscriptions" USING "btree" ("stripe_customer_id") WHERE ("stripe_customer_id" IS NOT NULL);



CREATE INDEX "idx_subscriptions_stripe_subscription_id" ON "public"."subscriptions" USING "btree" ("stripe_subscription_id") WHERE ("stripe_subscription_id" IS NOT NULL);



CREATE INDEX "idx_support_tickets_created_at" ON "public"."support_tickets" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_support_tickets_status" ON "public"."support_tickets" USING "btree" ("status");



CREATE INDEX "idx_support_tickets_user_id" ON "public"."support_tickets" USING "btree" ("user_id");



CREATE INDEX "idx_support_tickets_user_status" ON "public"."support_tickets" USING "btree" ("user_id", "status");



CREATE INDEX "idx_tasks_assigned" ON "public"."tasks" USING "btree" ("assigned_to_type", "assigned_to_id");



CREATE INDEX "idx_tasks_context" ON "public"."tasks" USING "btree" ("linked_context_type", "linked_context_id");



CREATE INDEX "idx_tasks_created_by" ON "public"."tasks" USING "btree" ("created_by");



CREATE INDEX "idx_tasks_deadline" ON "public"."tasks" USING "btree" ("deadline") WHERE ("deadline" IS NOT NULL);



CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING "btree" ("status");



CREATE INDEX "idx_tenant_invites_created_by" ON "public"."tenant_invites" USING "btree" ("created_by");



CREATE INDEX "idx_tenant_invites_email" ON "public"."tenant_invites" USING "btree" ("email");



CREATE INDEX "idx_tenant_invites_lease_id" ON "public"."tenant_invites" USING "btree" ("lease_id");



CREATE INDEX "idx_tenant_invites_property_id" ON "public"."tenant_invites" USING "btree" ("property_id");



CREATE INDEX "idx_tenant_invites_token" ON "public"."tenant_invites" USING "btree" ("token");



CREATE INDEX "idx_tenants_household_id" ON "public"."tenants" USING "btree" ("household_id") WHERE ("household_id" IS NOT NULL);



CREATE INDEX "idx_tenants_lease_id" ON "public"."tenants" USING "btree" ("lease_id");



CREATE INDEX "idx_tenants_property_id" ON "public"."tenants" USING "btree" ("property_id");



CREATE INDEX "idx_tenants_user_id" ON "public"."tenants" USING "btree" ("user_id");



CREATE INDEX "idx_units_property_id" ON "public"."units" USING "btree" ("property_id");



CREATE INDEX "idx_waitlist_email" ON "public"."waitlist" USING "btree" ("email");



CREATE INDEX "idx_waitlist_source" ON "public"."waitlist" USING "btree" ("source");



CREATE INDEX "idx_waitlist_status" ON "public"."waitlist" USING "btree" ("status");



CREATE UNIQUE INDEX "tenants_user_id_property_id_unique" ON "public"."tenants" USING "btree" ("user_id", "property_id") WHERE ("property_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "auto_end_leases_insert_trigger" BEFORE INSERT ON "public"."leases" FOR EACH ROW EXECUTE FUNCTION "public"."auto_end_leases"();



CREATE OR REPLACE TRIGGER "auto_end_leases_update_trigger" BEFORE UPDATE ON "public"."leases" FOR EACH ROW EXECUTE FUNCTION "public"."auto_end_leases"();



CREATE OR REPLACE TRIGGER "create_notifications_on_message_insert" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."create_message_notifications"();



CREATE OR REPLACE TRIGGER "enforce_daily_upload_cap_trigger" BEFORE INSERT ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_daily_upload_cap"();



CREATE OR REPLACE TRIGGER "enforce_invite_cap_trigger" BEFORE INSERT ON "public"."tenant_invites" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_invite_cap"();



CREATE OR REPLACE TRIGGER "expenses_updated_at" BEFORE UPDATE ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."update_expenses_updated_at"();



CREATE OR REPLACE TRIGGER "leases_updated_at" BEFORE UPDATE ON "public"."leases" FOR EACH ROW EXECUTE FUNCTION "public"."update_leases_updated_at"();



CREATE OR REPLACE TRIGGER "notes_updated_at" BEFORE UPDATE ON "public"."notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_notes_updated_at"();



CREATE OR REPLACE TRIGGER "prevent_ended_lease_updates_trigger" BEFORE UPDATE ON "public"."leases" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_ended_lease_updates"();



CREATE OR REPLACE TRIGGER "prevent_ended_status_transitions_trigger" BEFORE UPDATE ON "public"."leases" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_ended_status_transitions"();



CREATE OR REPLACE TRIGGER "receipt_settings_updated_at" BEFORE UPDATE ON "public"."receipt_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_receipt_settings_updated_at"();



CREATE OR REPLACE TRIGGER "tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_tasks_updated_at"();



CREATE OR REPLACE TRIGGER "update_households_updated_at" BEFORE UPDATE ON "public"."households" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_maintenance_requests_updated_at" BEFORE UPDATE ON "public"."maintenance_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_memberships_updated_at" BEFORE UPDATE ON "public"."memberships" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_properties_updated_at" BEFORE UPDATE ON "public"."properties" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_rent_records_updated_at" BEFORE UPDATE ON "public"."rent_records" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_subscriptions_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tenants_updated_at" BEFORE UPDATE ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_units_updated_at" BEFORE UPDATE ON "public"."units" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "validate_tenant_assignment_trigger" BEFORE INSERT ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."validate_tenant_assignment"();



CREATE OR REPLACE TRIGGER "validate_work_order_ownership_trigger" BEFORE INSERT ON "public"."maintenance_requests" FOR EACH ROW EXECUTE FUNCTION "public"."validate_work_order_ownership"();



ALTER TABLE ONLY "public"."abuse_events"
    ADD CONSTRAINT "abuse_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_releases"
    ADD CONSTRAINT "app_releases_deployed_by_fkey" FOREIGN KEY ("deployed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."compliance_audit_log"
    ADD CONSTRAINT "compliance_audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."compliance_audit_log"
    ADD CONSTRAINT "compliance_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."data_deletion_requests"
    ADD CONSTRAINT "data_deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."data_export_requests"
    ADD CONSTRAINT "data_export_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_deliveries"
    ADD CONSTRAINT "email_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_deliveries"
    ADD CONSTRAINT "email_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_preferences"
    ADD CONSTRAINT "email_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "feature_flags_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "public"."app_releases"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."households"
    ADD CONSTRAINT "households_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_field_mappings"
    ADD CONSTRAINT "lead_field_mappings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_import_events"
    ADD CONSTRAINT "lead_import_events_actor_fkey" FOREIGN KEY ("actor") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_import_event_id_fkey" FOREIGN KEY ("import_event_id") REFERENCES "public"."lead_import_events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leases"
    ADD CONSTRAINT "leases_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leases"
    ADD CONSTRAINT "leases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leases"
    ADD CONSTRAINT "leases_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_requests"
    ADD CONSTRAINT "maintenance_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."maintenance_requests"
    ADD CONSTRAINT "maintenance_requests_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_requests"
    ADD CONSTRAINT "maintenance_requests_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_requests"
    ADD CONSTRAINT "maintenance_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."newsletter_campaigns"
    ADD CONSTRAINT "newsletter_campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_settings"
    ADD CONSTRAINT "payment_settings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_group_assignments"
    ADD CONSTRAINT "property_group_assignments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."property_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_group_assignments"
    ADD CONSTRAINT "property_group_assignments_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_groups"
    ADD CONSTRAINT "property_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rate_limit_tracking"
    ADD CONSTRAINT "rate_limit_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."receipt_settings"
    ADD CONSTRAINT "receipt_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."release_events"
    ADD CONSTRAINT "release_events_actor_fkey" FOREIGN KEY ("actor") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."release_events"
    ADD CONSTRAINT "release_events_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "public"."app_releases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rent_records"
    ADD CONSTRAINT "rent_records_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rent_records"
    ADD CONSTRAINT "rent_records_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rent_records"
    ADD CONSTRAINT "rent_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stripe_connect_accounts"
    ADD CONSTRAINT "stripe_connect_accounts_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_invites"
    ADD CONSTRAINT "tenant_invites_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_invites"
    ADD CONSTRAINT "tenant_invites_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_invites"
    ADD CONSTRAINT "tenant_invites_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."units"
    ADD CONSTRAINT "units_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_property_types"
    ADD CONSTRAINT "user_property_types_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."waitlist"
    ADD CONSTRAINT "waitlist_converted_to_user_id_fkey" FOREIGN KEY ("converted_to_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



CREATE POLICY "Admins can update deletion requests" ON "public"."data_deletion_requests" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update export requests" ON "public"."data_export_requests" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update quota config" ON "public"."admin_quota_config" FOR UPDATE USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



CREATE POLICY "Admins can update support tickets" ON "public"."support_tickets" FOR UPDATE USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



CREATE POLICY "Admins can view admin metrics" ON "public"."admin_metrics" FOR SELECT USING ("public"."is_admin_user"());



CREATE POLICY "Admins can view admin security logs" ON "public"."admin_security_logs" FOR SELECT USING ("public"."is_admin_user"());



CREATE POLICY "Admins can view admin upload logs" ON "public"."admin_upload_logs" FOR SELECT USING ("public"."is_admin_user"());



CREATE POLICY "Admins can view all deletion requests" ON "public"."data_deletion_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all export requests" ON "public"."data_export_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all leases" ON "public"."leases" FOR SELECT USING ("public"."is_admin_user"());



CREATE POLICY "Admins can view all memberships" ON "public"."memberships" FOR SELECT USING ("public"."is_admin_user"());



CREATE POLICY "Admins can view all messages" ON "public"."messages" FOR SELECT USING ("public"."is_admin_user"());



CREATE POLICY "Admins can view all organizations" ON "public"."organizations" FOR SELECT USING ("public"."is_admin_user"());



CREATE POLICY "Admins can view all properties" ON "public"."properties" FOR SELECT USING ("public"."is_admin_user"());



CREATE POLICY "Admins can view all subscriptions" ON "public"."subscriptions" FOR SELECT USING ("public"."is_admin_user"());



CREATE POLICY "Admins can view all support tickets" ON "public"."support_tickets" FOR SELECT USING ("public"."is_admin_user"());



CREATE POLICY "Admins can view all tenants" ON "public"."tenants" FOR SELECT USING ("public"."is_admin_user"());



CREATE POLICY "Admins can view all users" ON "public"."users" FOR SELECT USING ((("id" = "auth"."uid"()) OR "public"."is_admin_user"()));



CREATE POLICY "Admins can view quota config" ON "public"."admin_quota_config" FOR SELECT USING ("public"."is_admin_user"());



CREATE POLICY "Allow anon waitlist inserts" ON "public"."waitlist" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anyone can view invite by token" ON "public"."tenant_invites" FOR SELECT USING (true);



CREATE POLICY "Landlords can create households" ON "public"."households" FOR INSERT WITH CHECK ("public"."user_can_access_property"("property_id"));



CREATE POLICY "Landlords can create invites for their properties" ON "public"."tenant_invites" FOR INSERT WITH CHECK ((("created_by" = "auth"."uid"()) AND ("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Landlords can create properties in their organizations" ON "public"."properties" FOR INSERT WITH CHECK (("public"."user_is_landlord_in_org"("organization_id") OR ("owner_id" = "auth"."uid"())));



CREATE POLICY "Landlords can create rent records for own properties" ON "public"."rent_records" FOR INSERT WITH CHECK ("public"."user_owns_property"("property_id"));



CREATE POLICY "Landlords can create rent records for their property leases" ON "public"."rent_records" FOR INSERT WITH CHECK ((("lease_id" IN ( SELECT "leases"."id"
   FROM "public"."leases"
  WHERE ("leases"."property_id" IN ( SELECT "properties"."id"
           FROM "public"."properties"
          WHERE (("properties"."owner_id" = "auth"."uid"()) OR ("properties"."organization_id" IN ( SELECT "memberships"."organization_id"
                   FROM "public"."memberships"
                  WHERE (("memberships"."user_id" = "auth"."uid"()) AND ("memberships"."role" = ANY (ARRAY['owner'::"text", 'collaborator'::"text"])))))))))) OR ("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE (("properties"."owner_id" = "auth"."uid"()) OR ("properties"."organization_id" IN ( SELECT "memberships"."organization_id"
           FROM "public"."memberships"
          WHERE (("memberships"."user_id" = "auth"."uid"()) AND ("memberships"."role" = ANY (ARRAY['owner'::"text", 'collaborator'::"text"]))))))))));



CREATE POLICY "Landlords can create tasks for their properties" ON "public"."tasks" FOR INSERT WITH CHECK ((("created_by" = "auth"."uid"()) AND ((("linked_context_type" = 'property'::"text") AND ("linked_context_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."owner_id" = "auth"."uid"())))) OR (("linked_context_type" = 'work_order'::"text") AND ("linked_context_id" IN ( SELECT "maintenance_requests"."id"
   FROM "public"."maintenance_requests"
  WHERE ("maintenance_requests"."property_id" IN ( SELECT "properties"."id"
           FROM "public"."properties"
          WHERE ("properties"."owner_id" = "auth"."uid"())))))) OR (("linked_context_type" = 'rent_record'::"text") AND ("linked_context_id" IN ( SELECT "rent_records"."id"
   FROM "public"."rent_records"
  WHERE ("rent_records"."property_id" IN ( SELECT "properties"."id"
           FROM "public"."properties"
          WHERE ("properties"."owner_id" = "auth"."uid"())))))))));



CREATE POLICY "Landlords can create tenants in their properties" ON "public"."tenants" FOR INSERT WITH CHECK (((("household_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "tenants"."household_id") AND "public"."user_can_access_property"("h"."property_id"))))) OR (("property_id" IS NOT NULL) AND "public"."user_can_access_property"("property_id"))));



CREATE POLICY "Landlords can delete documents from own properties" ON "public"."documents" FOR DELETE USING ("public"."user_owns_property"("property_id"));



CREATE POLICY "Landlords can delete expenses for their properties" ON "public"."expenses" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE (("properties"."id" = "expenses"."property_id") AND ("properties"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Landlords can delete households" ON "public"."households" FOR DELETE USING ("public"."user_can_access_property"("property_id"));



CREATE POLICY "Landlords can delete invites for their properties" ON "public"."tenant_invites" FOR DELETE USING ((("created_by" = "auth"."uid"()) OR ("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Landlords can delete leases for their units" ON "public"."leases" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."units"
     JOIN "public"."properties" ON (("properties"."id" = "units"."property_id")))
  WHERE (("units"."id" = "leases"."unit_id") AND ("properties"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Landlords can delete properties in their organizations" ON "public"."properties" FOR DELETE USING (("public"."user_is_landlord_in_org"("organization_id") OR ("owner_id" = "auth"."uid"())));



CREATE POLICY "Landlords can delete tasks for their properties" ON "public"."tasks" FOR DELETE USING ((("created_by" = "auth"."uid"()) OR (("linked_context_type" = 'property'::"text") AND ("linked_context_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."owner_id" = "auth"."uid"())))) OR (("linked_context_type" = 'work_order'::"text") AND ("linked_context_id" IN ( SELECT "maintenance_requests"."id"
   FROM "public"."maintenance_requests"
  WHERE ("maintenance_requests"."property_id" IN ( SELECT "properties"."id"
           FROM "public"."properties"
          WHERE ("properties"."owner_id" = "auth"."uid"()))))))));



CREATE POLICY "Landlords can delete tenants in their properties" ON "public"."tenants" FOR DELETE USING (((("household_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "tenants"."household_id") AND "public"."user_can_access_property"("h"."property_id"))))) OR (("property_id" IS NOT NULL) AND "public"."user_can_access_property"("property_id"))));



CREATE POLICY "Landlords can delete units for their properties" ON "public"."units" FOR DELETE USING (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."owner_id" = "auth"."uid"()))));



CREATE POLICY "Landlords can insert expenses for their properties" ON "public"."expenses" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE (("properties"."id" = "expenses"."property_id") AND ("properties"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Landlords can insert leases for their units" ON "public"."leases" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."units"
     JOIN "public"."properties" ON (("properties"."id" = "units"."property_id")))
  WHERE (("units"."id" = "leases"."unit_id") AND ("properties"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Landlords can insert units for their properties" ON "public"."units" FOR INSERT WITH CHECK (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."owner_id" = "auth"."uid"()))));



CREATE POLICY "Landlords can manage their own Connect accounts" ON "public"."stripe_connect_accounts" USING ((EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE (("properties"."id" = "stripe_connect_accounts"."property_id") AND ("properties"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Landlords can manage their own payment settings" ON "public"."payment_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE (("properties"."id" = "payment_settings"."property_id") AND ("properties"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Landlords can send landlord-tenant messages for their active un" ON "public"."messages" FOR INSERT WITH CHECK ((("lease_id" IN ( SELECT "leases"."id"
   FROM "public"."leases"
  WHERE (("leases"."unit_id" IN ( SELECT "units"."id"
           FROM "public"."units"
          WHERE ("units"."property_id" IN ( SELECT "properties"."id"
                   FROM "public"."properties"
                  WHERE (("properties"."owner_id" = "auth"."uid"()) OR ("properties"."organization_id" IN ( SELECT "memberships"."organization_id"
                           FROM "public"."memberships"
                          WHERE (("memberships"."user_id" = "auth"."uid"()) AND ("memberships"."role" = ANY (ARRAY['owner'::"text", 'collaborator'::"text"])))))))))) AND (("leases"."lease_end_date" IS NULL) OR ("leases"."lease_end_date" > "now"()))))) AND ("sender_id" = "auth"."uid"()) AND ("sender_role" = 'landlord'::"text") AND ("message_type" = 'landlord_tenant'::"text")));



CREATE POLICY "Landlords can update expenses for their properties" ON "public"."expenses" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE (("properties"."id" = "expenses"."property_id") AND ("properties"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Landlords can update households" ON "public"."households" FOR UPDATE USING ("public"."user_can_access_property"("property_id"));



CREATE POLICY "Landlords can update leases for their units" ON "public"."leases" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."units"
     JOIN "public"."properties" ON (("properties"."id" = "units"."property_id")))
  WHERE (("units"."id" = "leases"."unit_id") AND ("properties"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Landlords can update messages in their property leases" ON "public"."messages" FOR UPDATE USING (("lease_id" IN ( SELECT "leases"."id"
   FROM "public"."leases"
  WHERE ("leases"."property_id" IN ( SELECT "properties"."id"
           FROM "public"."properties"
          WHERE (("properties"."owner_id" = "auth"."uid"()) OR ("properties"."organization_id" IN ( SELECT "memberships"."organization_id"
                   FROM "public"."memberships"
                  WHERE (("memberships"."user_id" = "auth"."uid"()) AND ("memberships"."role" = ANY (ARRAY['owner'::"text", 'collaborator'::"text"]))))))))))) WITH CHECK (("lease_id" IN ( SELECT "leases"."id"
   FROM "public"."leases"
  WHERE ("leases"."property_id" IN ( SELECT "properties"."id"
           FROM "public"."properties"
          WHERE (("properties"."owner_id" = "auth"."uid"()) OR ("properties"."organization_id" IN ( SELECT "memberships"."organization_id"
                   FROM "public"."memberships"
                  WHERE (("memberships"."user_id" = "auth"."uid"()) AND ("memberships"."role" = ANY (ARRAY['owner'::"text", 'collaborator'::"text"])))))))))));



CREATE POLICY "Landlords can update properties in their organizations" ON "public"."properties" FOR UPDATE USING (("public"."user_is_landlord_in_org"("organization_id") OR ("owner_id" = "auth"."uid"())));



CREATE POLICY "Landlords can update rent records for own properties" ON "public"."rent_records" FOR UPDATE USING ("public"."user_owns_property"("property_id"));



CREATE POLICY "Landlords can update rent records for their property leases" ON "public"."rent_records" FOR UPDATE USING ((("lease_id" IN ( SELECT "leases"."id"
   FROM "public"."leases"
  WHERE ("leases"."property_id" IN ( SELECT "properties"."id"
           FROM "public"."properties"
          WHERE (("properties"."owner_id" = "auth"."uid"()) OR ("properties"."organization_id" IN ( SELECT "memberships"."organization_id"
                   FROM "public"."memberships"
                  WHERE (("memberships"."user_id" = "auth"."uid"()) AND ("memberships"."role" = ANY (ARRAY['owner'::"text", 'collaborator'::"text"])))))))))) OR ("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE (("properties"."owner_id" = "auth"."uid"()) OR ("properties"."organization_id" IN ( SELECT "memberships"."organization_id"
           FROM "public"."memberships"
          WHERE (("memberships"."user_id" = "auth"."uid"()) AND ("memberships"."role" = ANY (ARRAY['owner'::"text", 'collaborator'::"text"]))))))))));



CREATE POLICY "Landlords can update requests for own properties" ON "public"."maintenance_requests" FOR UPDATE USING ("public"."user_owns_property"("property_id"));



CREATE POLICY "Landlords can update tasks for their properties" ON "public"."tasks" FOR UPDATE USING ((("created_by" = "auth"."uid"()) OR (("linked_context_type" = 'property'::"text") AND ("linked_context_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."owner_id" = "auth"."uid"())))) OR (("linked_context_type" = 'work_order'::"text") AND ("linked_context_id" IN ( SELECT "maintenance_requests"."id"
   FROM "public"."maintenance_requests"
  WHERE ("maintenance_requests"."property_id" IN ( SELECT "properties"."id"
           FROM "public"."properties"
          WHERE ("properties"."owner_id" = "auth"."uid"()))))))));



CREATE POLICY "Landlords can update tenants in their properties" ON "public"."tenants" FOR UPDATE USING (((("household_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "tenants"."household_id") AND "public"."user_can_access_property"("h"."property_id"))))) OR (("property_id" IS NOT NULL) AND "public"."user_can_access_property"("property_id"))));



CREATE POLICY "Landlords can update units for their properties" ON "public"."units" FOR UPDATE USING (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."owner_id" = "auth"."uid"()))));



CREATE POLICY "Landlords can upload documents to own properties" ON "public"."documents" FOR INSERT WITH CHECK (("public"."user_owns_property"("property_id") AND ("uploaded_by" = "auth"."uid"())));



CREATE POLICY "Landlords can view all tasks for their properties" ON "public"."tasks" FOR SELECT USING ((("created_by" = "auth"."uid"()) OR (("assigned_to_type" = 'tenant'::"text") AND ("assigned_to_id" IN ( SELECT "tenants"."id"
   FROM "public"."tenants"
  WHERE ("tenants"."user_id" = "auth"."uid"())))) OR (("linked_context_type" = 'property'::"text") AND ("linked_context_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."owner_id" = "auth"."uid"())))) OR (("linked_context_type" = 'work_order'::"text") AND ("linked_context_id" IN ( SELECT "maintenance_requests"."id"
   FROM "public"."maintenance_requests"
  WHERE ("maintenance_requests"."property_id" IN ( SELECT "properties"."id"
           FROM "public"."properties"
          WHERE ("properties"."owner_id" = "auth"."uid"()))))))));



CREATE POLICY "Landlords can view expenses for their properties" ON "public"."expenses" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE (("properties"."id" = "expenses"."property_id") AND ("properties"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Landlords can view households for their properties" ON "public"."households" FOR SELECT USING ("public"."user_can_access_property"("property_id"));



CREATE POLICY "Landlords can view invites for their properties" ON "public"."tenant_invites" FOR SELECT USING ((("created_by" = "auth"."uid"()) OR ("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Landlords can view leases for their units" ON "public"."leases" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."units"
     JOIN "public"."properties" ON (("properties"."id" = "units"."property_id")))
  WHERE (("units"."id" = "leases"."unit_id") AND ("properties"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Landlords can view messages for their unit leases" ON "public"."messages" FOR SELECT USING ((("lease_id" IN ( SELECT "leases"."id"
   FROM "public"."leases"
  WHERE ("leases"."unit_id" IN ( SELECT "units"."id"
           FROM "public"."units"
          WHERE ("units"."property_id" IN ( SELECT "properties"."id"
                   FROM "public"."properties"
                  WHERE (("properties"."owner_id" = "auth"."uid"()) OR ("properties"."organization_id" IN ( SELECT "memberships"."organization_id"
                           FROM "public"."memberships"
                          WHERE (("memberships"."user_id" = "auth"."uid"()) AND ("memberships"."role" = ANY (ARRAY['owner'::"text", 'collaborator'::"text"])))))))))))) AND ("message_type" = 'landlord_tenant'::"text")));



CREATE POLICY "Landlords can view properties in their organizations" ON "public"."properties" FOR SELECT USING (("public"."user_is_landlord_in_org"("organization_id") OR ("owner_id" = "auth"."uid"()) OR ("id" IN ( SELECT "h"."property_id"
   FROM ("public"."households" "h"
     JOIN "public"."tenants" "t" ON (("t"."household_id" = "h"."id")))
  WHERE ("t"."user_id" = "auth"."uid"()))) OR ("id" IN ( SELECT "tenants"."property_id"
   FROM "public"."tenants"
  WHERE ("tenants"."user_id" = "auth"."uid"())))));



CREATE POLICY "Landlords can view property payments" ON "public"."payments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE (("properties"."id" = "payments"."property_id") AND ("properties"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Landlords can view rent records for own properties" ON "public"."rent_records" FOR SELECT USING (("public"."user_owns_property"("property_id") OR ("tenant_id" IN ( SELECT "tenants"."id"
   FROM "public"."tenants"
  WHERE ("tenants"."user_id" = "auth"."uid"())))));



CREATE POLICY "Landlords can view rent records for their property leases" ON "public"."rent_records" FOR SELECT USING ((("lease_id" IN ( SELECT "leases"."id"
   FROM "public"."leases"
  WHERE ("leases"."property_id" IN ( SELECT "properties"."id"
           FROM "public"."properties"
          WHERE (("properties"."owner_id" = "auth"."uid"()) OR ("properties"."organization_id" IN ( SELECT "memberships"."organization_id"
                   FROM "public"."memberships"
                  WHERE (("memberships"."user_id" = "auth"."uid"()) AND ("memberships"."role" = ANY (ARRAY['owner'::"text", 'collaborator'::"text"])))))))))) OR ("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE (("properties"."owner_id" = "auth"."uid"()) OR ("properties"."organization_id" IN ( SELECT "memberships"."organization_id"
           FROM "public"."memberships"
          WHERE (("memberships"."user_id" = "auth"."uid"()) AND ("memberships"."role" = ANY (ARRAY['owner'::"text", 'collaborator'::"text"]))))))))));



CREATE POLICY "Landlords can view requests for own properties" ON "public"."maintenance_requests" FOR SELECT USING (("public"."user_owns_property"("property_id") OR ("tenant_id" IN ( SELECT "tenants"."id"
   FROM "public"."tenants"
  WHERE ("tenants"."user_id" = "auth"."uid"())))));



CREATE POLICY "Landlords can view tenants in their properties" ON "public"."tenants" FOR SELECT USING (((("household_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."households" "h"
  WHERE (("h"."id" = "tenants"."household_id") AND "public"."user_can_access_property"("h"."property_id"))))) OR (("property_id" IS NOT NULL) AND "public"."user_can_access_property"("property_id")) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Landlords can view their own Connect accounts" ON "public"."stripe_connect_accounts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE (("properties"."id" = "stripe_connect_accounts"."property_id") AND ("properties"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Landlords can view their own payment settings" ON "public"."payment_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE (("properties"."id" = "payment_settings"."property_id") AND ("properties"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Landlords can view units for their properties" ON "public"."units" FOR SELECT USING (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."owner_id" = "auth"."uid"()))));



CREATE POLICY "Only admins can insert import events" ON "public"."lead_import_events" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can insert release events" ON "public"."release_events" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can insert waitlist" ON "public"."waitlist" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can manage app releases" ON "public"."app_releases" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can manage feature flags" ON "public"."feature_flags" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can manage field mappings" ON "public"."lead_field_mappings" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can manage leads" ON "public"."leads" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can manage newsletter campaigns" ON "public"."newsletter_campaigns" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can manage promo codes" ON "public"."promo_codes" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can update kill switch" ON "public"."scraper_kill_switch" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can update waitlist" ON "public"."waitlist" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can view app releases" ON "public"."app_releases" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can view compliance audit log" ON "public"."compliance_audit_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can view feature flags" ON "public"."feature_flags" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can view field mappings" ON "public"."lead_field_mappings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can view import events" ON "public"."lead_import_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can view kill switch" ON "public"."scraper_kill_switch" FOR SELECT USING (true);



CREATE POLICY "Only admins can view leads" ON "public"."leads" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can view newsletter campaigns" ON "public"."newsletter_campaigns" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can view promo codes" ON "public"."promo_codes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can view release events" ON "public"."release_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can view scraper runs" ON "public"."scraper_runs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can view waitlist" ON "public"."waitlist" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Owners can create memberships" ON "public"."memberships" FOR INSERT WITH CHECK ("public"."user_is_owner_of_org"("organization_id"));



CREATE POLICY "Owners can create subscriptions" ON "public"."subscriptions" FOR INSERT WITH CHECK ("public"."user_is_owner_of_org"("organization_id"));



CREATE POLICY "Owners can delete memberships" ON "public"."memberships" FOR DELETE USING ("public"."user_is_owner_of_org"("organization_id"));



CREATE POLICY "Owners can delete subscriptions" ON "public"."subscriptions" FOR DELETE USING ("public"."user_is_owner_of_org"("organization_id"));



CREATE POLICY "Owners can delete their organizations" ON "public"."organizations" FOR DELETE USING ("public"."user_is_owner_of_org"("id"));



CREATE POLICY "Owners can update memberships" ON "public"."memberships" FOR UPDATE USING ("public"."user_is_owner_of_org"("organization_id"));



CREATE POLICY "Owners can update subscriptions" ON "public"."subscriptions" FOR UPDATE USING ("public"."user_is_owner_of_org"("organization_id"));



CREATE POLICY "Owners can update their organizations" ON "public"."organizations" FOR UPDATE USING ("public"."user_is_owner_of_org"("id"));



CREATE POLICY "Owners can view subscriptions" ON "public"."subscriptions" FOR SELECT USING ("public"."user_is_owner_of_org"("organization_id"));



CREATE POLICY "System can insert compliance audit log" ON "public"."compliance_audit_log" FOR INSERT WITH CHECK (true);



CREATE POLICY "Tenants can create requests for own properties" ON "public"."maintenance_requests" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenants"."id"
   FROM "public"."tenants"
  WHERE ("tenants"."user_id" = "auth"."uid"()))));



CREATE POLICY "Tenants can send household messages for their active leases" ON "public"."messages" FOR INSERT WITH CHECK ((("lease_id" IN ( SELECT "leases"."id"
   FROM "public"."leases"
  WHERE (("leases"."tenant_id" IN ( SELECT "tenants"."id"
           FROM "public"."tenants"
          WHERE ("tenants"."user_id" = "auth"."uid"()))) AND (("leases"."lease_end_date" IS NULL) OR ("leases"."lease_end_date" > "now"()))))) AND ("sender_id" = "auth"."uid"()) AND ("sender_role" = 'tenant'::"text") AND ("message_type" = 'household'::"text")));



CREATE POLICY "Tenants can update own rent records status" ON "public"."rent_records" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenants"."id"
   FROM "public"."tenants"
  WHERE ("tenants"."user_id" = "auth"."uid"())))) WITH CHECK (("tenant_id" IN ( SELECT "tenants"."id"
   FROM "public"."tenants"
  WHERE ("tenants"."user_id" = "auth"."uid"()))));



CREATE POLICY "Tenants can update tasks assigned to them" ON "public"."tasks" FOR UPDATE USING ((("assigned_to_type" = 'tenant'::"text") AND ("assigned_to_id" IN ( SELECT "tenants"."id"
   FROM "public"."tenants"
  WHERE ("tenants"."user_id" = "auth"."uid"())))));



CREATE POLICY "Tenants can update their lease status" ON "public"."leases" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."tenants"
  WHERE (("tenants"."lease_id" = "leases"."id") AND ("tenants"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tenants"
  WHERE (("tenants"."lease_id" = "leases"."id") AND ("tenants"."user_id" = "auth"."uid"())))));



CREATE POLICY "Tenants can view leases for their units" ON "public"."leases" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."tenants"
  WHERE (("tenants"."lease_id" = "leases"."id") AND ("tenants"."user_id" = "auth"."uid"())))));



CREATE POLICY "Tenants can view messages for their leases" ON "public"."messages" FOR SELECT USING ((("lease_id" IN ( SELECT "leases"."id"
   FROM "public"."leases"
  WHERE ("leases"."tenant_id" IN ( SELECT "tenants"."id"
           FROM "public"."tenants"
          WHERE ("tenants"."user_id" = "auth"."uid"()))))) AND ("message_type" = 'household'::"text")));



CREATE POLICY "Tenants can view rent records for their leases" ON "public"."rent_records" FOR SELECT USING ((("lease_id" IN ( SELECT "leases"."id"
   FROM "public"."leases"
  WHERE ("leases"."tenant_id" IN ( SELECT "tenants"."id"
           FROM "public"."tenants"
          WHERE ("tenants"."user_id" = "auth"."uid"()))))) OR ("tenant_id" IN ( SELECT "tenants"."id"
   FROM "public"."tenants"
  WHERE ("tenants"."user_id" = "auth"."uid"())))));



CREATE POLICY "Tenants can view their households" ON "public"."households" FOR SELECT USING ("public"."user_is_tenant_in_household"("id"));



CREATE POLICY "Tenants can view their own payments" ON "public"."payments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."tenants"
  WHERE (("tenants"."id" = "payments"."tenant_id") AND ("tenants"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create support tickets" ON "public"."support_tickets" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can create their own deletion requests" ON "public"."data_deletion_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own export requests" ON "public"."data_export_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete assignments for their properties" ON "public"."property_group_assignments" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE (("properties"."id" = "property_group_assignments"."property_id") AND ("properties"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own membership" ON "public"."memberships" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own notes" ON "public"."notes" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own property groups" ON "public"."property_groups" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own property types" ON "public"."user_property_types" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own push subscriptions" ON "public"."push_subscriptions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert assignments for their properties" ON "public"."property_group_assignments" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE (("properties"."id" = "property_group_assignments"."property_id") AND ("properties"."owner_id" = "auth"."uid"())))) AND (EXISTS ( SELECT 1
   FROM "public"."property_groups"
  WHERE (("property_groups"."id" = "property_group_assignments"."group_id") AND ("property_groups"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can insert own data" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own email preferences" ON "public"."email_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own notes" ON "public"."notes" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own property groups" ON "public"."property_groups" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own property types" ON "public"."user_property_types" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own push subscriptions" ON "public"."push_subscriptions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own receipt settings" ON "public"."receipt_settings" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read accessible user data" ON "public"."users" FOR SELECT USING ((("id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."tenants" "t"
     JOIN "public"."properties" "p" ON (("t"."property_id" = "p"."id")))
  WHERE (("t"."user_id" = "users"."id") AND ("p"."owner_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."tenants" "t"
     JOIN "public"."properties" "p" ON (("t"."property_id" = "p"."id")))
  WHERE (("t"."user_id" = "auth"."uid"()) AND ("p"."owner_id" = "users"."id")))) OR (EXISTS ( SELECT 1
   FROM ("public"."tenants" "t1"
     JOIN "public"."tenants" "t2" ON (("t1"."property_id" = "t2"."property_id")))
  WHERE (("t1"."user_id" = "auth"."uid"()) AND ("t2"."user_id" = "users"."id"))))));



COMMENT ON POLICY "Users can read accessible user data" ON "public"."users" IS 'Optimized policy: users read their own data, landlords see tenant data, tenants see landlords and housemates. Replaces multiple conflicting policies that caused 500 errors.';



CREATE POLICY "Users can read own data" ON "public"."users" FOR SELECT USING ((("auth"."uid"() = "id") OR ("id" IN ( SELECT "tenants"."user_id"
   FROM "public"."tenants"
  WHERE ("tenants"."property_id" IN ( SELECT "properties"."id"
           FROM "public"."properties"
          WHERE ("properties"."owner_id" = "auth"."uid"())))))));



CREATE POLICY "Users can update own data" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own email preferences" ON "public"."email_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own messages" ON "public"."messages" FOR UPDATE USING (("sender_id" = "auth"."uid"())) WITH CHECK (("sender_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own notes" ON "public"."notes" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own property groups" ON "public"."property_groups" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own push subscriptions" ON "public"."push_subscriptions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own receipt settings" ON "public"."receipt_settings" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view assignments for their properties" ON "public"."property_group_assignments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE (("properties"."id" = "property_group_assignments"."property_id") AND ("properties"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Users can view memberships in same organization" ON "public"."memberships" FOR SELECT USING ("public"."user_has_membership_in_org"("organization_id"));



CREATE POLICY "Users can view organizations they belong to" ON "public"."organizations" FOR SELECT USING ("public"."user_has_membership_in_org"("id"));



CREATE POLICY "Users can view their own abuse events" ON "public"."abuse_events" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own deletion requests" ON "public"."data_deletion_requests" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own email deliveries" ON "public"."email_deliveries" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own email preferences" ON "public"."email_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own export requests" ON "public"."data_export_requests" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own membership" ON "public"."memberships" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own notes" ON "public"."notes" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own property groups" ON "public"."property_groups" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own property types" ON "public"."user_property_types" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own push subscriptions" ON "public"."push_subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own rate limit tracking" ON "public"."rate_limit_tracking" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own receipt settings" ON "public"."receipt_settings" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own support tickets" ON "public"."support_tickets" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."abuse_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_quota_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_security_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_upload_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "allow_all_documents" ON "public"."documents" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_expenses" ON "public"."expenses" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_leases" ON "public"."leases" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_maintenance" ON "public"."maintenance_requests" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_messages" ON "public"."messages" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_notifications" ON "public"."notifications" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_rent_records" ON "public"."rent_records" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_tenant_invites" ON "public"."tenant_invites" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_units" ON "public"."units" USING (true) WITH CHECK (true);



ALTER TABLE "public"."app_releases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."compliance_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_deletion_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_export_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_flags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."households" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_field_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_import_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."maintenance_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."newsletter_campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."promo_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."properties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."property_group_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."property_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rate_limit_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."receipt_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."release_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rent_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scraper_kill_switch" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scraper_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_connect_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_tickets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_property_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."waitlist" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."auto_end_leases"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_end_leases"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_end_leases"() TO "service_role";



GRANT ALL ON FUNCTION "public"."batch_end_expired_leases"() TO "anon";
GRANT ALL ON FUNCTION "public"."batch_end_expired_leases"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."batch_end_expired_leases"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_add_collaborator"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_add_collaborator"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_add_collaborator"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_quota"("p_user_id" "uuid", "p_quota_type" "text", "p_is_staging" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."check_quota"("p_user_id" "uuid", "p_quota_type" "text", "p_is_staging" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_quota"("p_user_id" "uuid", "p_quota_type" "text", "p_is_staging" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_message_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_message_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_message_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_system_message"("p_lease_id" "uuid", "p_body" "text", "p_intent" "text", "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_system_message"("p_lease_id" "uuid", "p_body" "text", "p_intent" "text", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_system_message"("p_lease_id" "uuid", "p_body" "text", "p_intent" "text", "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_daily_upload_cap"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_daily_upload_cap"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_daily_upload_cap"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_invite_cap"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_invite_cap"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_invite_cap"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_quota"("p_user_id" "uuid", "p_quota_type" "text", "p_is_staging" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_quota"("p_user_id" "uuid", "p_quota_type" "text", "p_is_staging" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_quota"("p_user_id" "uuid", "p_quota_type" "text", "p_is_staging" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_landlord_organization"("owner_user_id" "uuid", "org_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_landlord_organization"("owner_user_id" "uuid", "org_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_landlord_organization"("owner_user_id" "uuid", "org_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organization_by_owner"("owner_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_by_owner"("owner_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_by_owner"("owner_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organization_landlord_count"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_landlord_count"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_landlord_count"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_property_organization_id"("p_property_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_property_organization_id"("p_property_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_property_organization_id"("p_property_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_table_columns"("p_table_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_table_columns"("p_table_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_table_columns"("p_table_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_organizations"("user_id_param" "uuid", "role_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_organizations"("user_id_param" "uuid", "role_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_organizations"("user_id_param" "uuid", "role_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_newsletter_clicked"("campaign_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_newsletter_clicked"("campaign_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_newsletter_clicked"("campaign_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_newsletter_opened"("campaign_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_newsletter_opened"("campaign_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_newsletter_opened"("campaign_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_lease_active"("lease_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_lease_active"("lease_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_lease_active"("lease_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_ended_lease_updates"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_ended_lease_updates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_ended_lease_updates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_ended_status_transitions"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_ended_status_transitions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_ended_status_transitions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_expenses_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_expenses_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_expenses_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_leases_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_leases_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_leases_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_notes_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_notes_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_notes_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_receipt_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_receipt_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_receipt_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tasks_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tasks_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tasks_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_access_property"("p_property_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_access_property"("p_property_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_access_property"("p_property_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_membership_in_org"("p_organization_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_membership_in_org"("p_organization_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_membership_in_org"("p_organization_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_is_landlord_in_org"("p_organization_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_landlord_in_org"("p_organization_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_landlord_in_org"("p_organization_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_is_owner_of_org"("p_organization_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_owner_of_org"("p_organization_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_owner_of_org"("p_organization_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_is_tenant_in_household"("p_household_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_tenant_in_household"("p_household_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_tenant_in_household"("p_household_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_is_tenant_of_property"("property_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_tenant_of_property"("property_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_tenant_of_property"("property_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_owns_property"("property_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_owns_property"("property_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_owns_property"("property_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_tenant_assignment"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_tenant_assignment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_tenant_assignment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_work_order_ownership"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_work_order_ownership"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_work_order_ownership"() TO "service_role";


















GRANT ALL ON TABLE "public"."abuse_events" TO "anon";
GRANT ALL ON TABLE "public"."abuse_events" TO "authenticated";
GRANT ALL ON TABLE "public"."abuse_events" TO "service_role";



GRANT ALL ON TABLE "public"."admin_metrics" TO "anon";
GRANT ALL ON TABLE "public"."admin_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."admin_quota_config" TO "anon";
GRANT ALL ON TABLE "public"."admin_quota_config" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_quota_config" TO "service_role";



GRANT ALL ON TABLE "public"."admin_security_logs" TO "anon";
GRANT ALL ON TABLE "public"."admin_security_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_security_logs" TO "service_role";



GRANT ALL ON TABLE "public"."admin_upload_logs" TO "anon";
GRANT ALL ON TABLE "public"."admin_upload_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_upload_logs" TO "service_role";



GRANT ALL ON TABLE "public"."app_releases" TO "anon";
GRANT ALL ON TABLE "public"."app_releases" TO "authenticated";
GRANT ALL ON TABLE "public"."app_releases" TO "service_role";



GRANT ALL ON TABLE "public"."compliance_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."compliance_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."compliance_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."data_deletion_requests" TO "anon";
GRANT ALL ON TABLE "public"."data_deletion_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."data_deletion_requests" TO "service_role";



GRANT ALL ON TABLE "public"."data_export_requests" TO "anon";
GRANT ALL ON TABLE "public"."data_export_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."data_export_requests" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."email_deliveries" TO "anon";
GRANT ALL ON TABLE "public"."email_deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."email_deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."email_preferences" TO "anon";
GRANT ALL ON TABLE "public"."email_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."email_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."feature_flags" TO "anon";
GRANT ALL ON TABLE "public"."feature_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_flags" TO "service_role";



GRANT ALL ON TABLE "public"."households" TO "anon";
GRANT ALL ON TABLE "public"."households" TO "authenticated";
GRANT ALL ON TABLE "public"."households" TO "service_role";



GRANT ALL ON TABLE "public"."lead_field_mappings" TO "anon";
GRANT ALL ON TABLE "public"."lead_field_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_field_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."lead_import_events" TO "anon";
GRANT ALL ON TABLE "public"."lead_import_events" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_import_events" TO "service_role";



GRANT ALL ON TABLE "public"."leads" TO "anon";
GRANT ALL ON TABLE "public"."leads" TO "authenticated";
GRANT ALL ON TABLE "public"."leads" TO "service_role";



GRANT ALL ON TABLE "public"."leases" TO "anon";
GRANT ALL ON TABLE "public"."leases" TO "authenticated";
GRANT ALL ON TABLE "public"."leases" TO "service_role";



GRANT ALL ON TABLE "public"."maintenance_requests" TO "anon";
GRANT ALL ON TABLE "public"."maintenance_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_requests" TO "service_role";



GRANT ALL ON TABLE "public"."memberships" TO "anon";
GRANT ALL ON TABLE "public"."memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."memberships" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."newsletter_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."newsletter_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."newsletter_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."notes" TO "anon";
GRANT ALL ON TABLE "public"."notes" TO "authenticated";
GRANT ALL ON TABLE "public"."notes" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."payment_settings" TO "anon";
GRANT ALL ON TABLE "public"."payment_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_settings" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."promo_codes" TO "anon";
GRANT ALL ON TABLE "public"."promo_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."promo_codes" TO "service_role";



GRANT ALL ON TABLE "public"."properties" TO "anon";
GRANT ALL ON TABLE "public"."properties" TO "authenticated";
GRANT ALL ON TABLE "public"."properties" TO "service_role";



GRANT ALL ON TABLE "public"."property_group_assignments" TO "anon";
GRANT ALL ON TABLE "public"."property_group_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."property_group_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."property_groups" TO "anon";
GRANT ALL ON TABLE "public"."property_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."property_groups" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limit_tracking" TO "anon";
GRANT ALL ON TABLE "public"."rate_limit_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limit_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."receipt_settings" TO "anon";
GRANT ALL ON TABLE "public"."receipt_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."receipt_settings" TO "service_role";



GRANT ALL ON TABLE "public"."release_events" TO "anon";
GRANT ALL ON TABLE "public"."release_events" TO "authenticated";
GRANT ALL ON TABLE "public"."release_events" TO "service_role";



GRANT ALL ON TABLE "public"."rent_records" TO "anon";
GRANT ALL ON TABLE "public"."rent_records" TO "authenticated";
GRANT ALL ON TABLE "public"."rent_records" TO "service_role";



GRANT ALL ON TABLE "public"."scraper_kill_switch" TO "anon";
GRANT ALL ON TABLE "public"."scraper_kill_switch" TO "authenticated";
GRANT ALL ON TABLE "public"."scraper_kill_switch" TO "service_role";



GRANT ALL ON TABLE "public"."scraper_runs" TO "anon";
GRANT ALL ON TABLE "public"."scraper_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."scraper_runs" TO "service_role";



GRANT ALL ON TABLE "public"."stripe_connect_accounts" TO "anon";
GRANT ALL ON TABLE "public"."stripe_connect_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_connect_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."support_tickets" TO "anon";
GRANT ALL ON TABLE "public"."support_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."support_tickets" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_invites" TO "anon";
GRANT ALL ON TABLE "public"."tenant_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_invites" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



GRANT ALL ON TABLE "public"."units" TO "anon";
GRANT ALL ON TABLE "public"."units" TO "authenticated";
GRANT ALL ON TABLE "public"."units" TO "service_role";



GRANT ALL ON TABLE "public"."user_property_types" TO "anon";
GRANT ALL ON TABLE "public"."user_property_types" TO "authenticated";
GRANT ALL ON TABLE "public"."user_property_types" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."waitlist" TO "anon";
GRANT ALL ON TABLE "public"."waitlist" TO "authenticated";
GRANT ALL ON TABLE "public"."waitlist" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































