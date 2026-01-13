# Row Level Security (RLS) Policies

## Overview

All tables in the uhome database have Row Level Security (RLS) enabled. This ensures that users can only access data they are authorized to see, regardless of how they access the database (direct SQL, API, Edge Functions, etc.).

**Critical Security Principle:** Dev mode does NOT bypass RLS. All RLS policies are enforced even when dev mode is active.

## Core Security Rules

### Tenant Access Rules

Tenants can only:
- **Read properties** they are assigned to (via `tenants` table → `property_id`)
- **Read work orders** where `visibility_to_tenants = true` AND `property_id` matches their assigned property
- **Upload files** only to properties they are assigned to
- **View messages** for leases they are part of
- **View documents** for properties they are assigned to
- **View rent records** for their own tenant record

### Landlord Access Rules

Landlords can:
- **Manage properties** they own OR properties in organizations where they have 'owner' or 'collaborator' role
- **View tenant uploads** for properties they own/manage
- **View all work orders** for their properties (regardless of `visibility_to_tenants`)
- **Create work orders** for their properties
- **Update work order status** (tenants can only confirm resolution)
- **View messages** for leases on their properties
- **Manage documents** for their properties

## Policy Coverage by Table

### Users Table

**Policies:**
- `Users can read own data` - Users can only SELECT their own user record
- `Users can update own data` - Users can only UPDATE their own user record

**Security:** Users cannot see or modify other users' data.

### Properties Table

**Policies:**
- `Landlords can view properties in their organizations` - Landlords see properties they own or are members of
- `Landlords can create properties in their organizations` - Landlords can create properties in their organizations
- `Landlords can update properties in their organizations` - Landlords can update properties they own/manage
- `Landlords can delete properties in their organizations` - Landlords can delete properties they own/manage

**Tenant Access:**
- Tenants can view properties via the SELECT policy that checks `tenants.property_id`
- Tenants cannot create, update, or delete properties

**Security:** Property access is scoped to ownership or organization membership.

### Maintenance Requests (Work Orders) Table

**Policies:**
- `Landlords can view maintenance requests for their properties` - Landlords see all work orders for their properties
- `Tenants can view visible maintenance requests for their properties` - Tenants only see work orders where `visibility_to_tenants = true`
- `Landlords can create maintenance requests for their properties` - Landlords can create work orders
- `Tenants can create maintenance requests for their property` - Tenants can create work orders for their property
- `Landlords can update maintenance requests for their properties` - Landlords can update any field
- `Tenants can confirm resolution` - Tenants can only update status from 'resolved' to 'closed'

**Security:** 
- Tenants cannot see landlord-only work orders (`visibility_to_tenants = false`)
- Tenants cannot update work order status (except confirming resolution)
- Work orders are property-scoped

### Documents Table

**Policies:**
- `Landlords and tenants can view documents for their properties` - Both roles can view documents for their properties
- `Landlords can upload documents to own properties` - Only landlords can upload
- `Landlords can delete documents from own properties` - Only landlords can delete

**Security:**
- Tenants can view but not upload/delete documents
- Document access is property-scoped

### Messages Table

**Policies:**
- Messages are lease-scoped (see `supabase/migrations/create_messages_rls.sql`)
- Users can only view messages for leases they have access to
- Users can only send messages to leases they have access to

**Security:**
- Messages are scoped to lease relationships
- Tenants can only message about their own leases
- Landlords can only message about leases on their properties

### Tenant Invites Table

**Policies:**
- `Landlords can view invites for their properties` - Landlords see invites for their properties
- `Landlords can create invites for their properties` - Landlords can create invites
- `Landlords can delete invites for their properties` - Landlords can delete invites
- `Anyone can view invite by token` - Public read for invite acceptance flow (token validated in app)

**Security:**
- Invites are property-scoped
- Token-based access is validated in application logic

### Tasks Table

**Policies:**
- `Landlords can view all tasks for their properties` - Landlords see all tasks
- `Landlords can create tasks for their properties` - Landlords can create tasks
- `Tenants can view tasks assigned to them` - Tenants see tasks assigned to them
- `Tenants can update tasks assigned to them` - Tenants can update their tasks

**Security:**
- Tasks are scoped by assignment (`assigned_to_type`, `assigned_to_id`)
- Tasks are linked to properties/work orders for landlord access

### Rate Limit Tracking Table

**Policies:**
- `Users can view their own rate limit tracking` - Users see their own tracking records

**Security:**
- Service role (Edge Functions) can insert
- Regular users cannot insert directly (only via Edge Functions)

### Abuse Events Table

**Policies:**
- `Users can view their own abuse events` - Users see their own abuse events

**Security:**
- Service role (Edge Functions) can insert
- Regular users cannot insert directly (only via Edge Functions)

## Dev Mode and RLS

**Critical:** Dev mode does NOT bypass RLS policies.

Even when dev mode is active:
- All RLS policies are enforced
- Tenants still cannot see landlord-only work orders
- Users still cannot access data outside their permissions
- Property access is still scoped to ownership/assignment

**Why:** Dev mode is for testing with realistic data, not for bypassing security. All tests must respect RLS policies.

## Testing RLS Policies

### Manual Verification

Run the audit script:
```sql
-- Run in Supabase SQL Editor
\i supabase/migrations/verify_rls_coverage.sql
```

### Automated Testing

E2E tests verify RLS enforcement:
- Tenant cannot access other tenants' data
- Tenant cannot see landlord-only work orders
- Landlord cannot access other landlords' properties
- Dev mode does not bypass RLS

See `tests/e2e/abuse/` for RLS violation tests.

## Policy Maintenance

### Adding New Tables

When adding a new table:
1. Enable RLS: `ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;`
2. Create policies for SELECT, INSERT, UPDATE, DELETE as needed
3. Test policies with both tenant and landlord roles
4. Document policies in this file

### Modifying Policies

When modifying policies:
1. Test with both tenant and landlord roles
2. Verify edge cases (e.g., tenant removed mid-session)
3. Update this documentation
4. Run audit script to verify coverage

## Common Policy Patterns

### Property-Scoped Access

```sql
CREATE POLICY "Users can view property-scoped data"
  ON public.some_table FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
      OR property_id IN (
        SELECT property_id FROM public.tenants WHERE user_id = auth.uid()
      )
    )
  );
```

### Role-Based Access

```sql
CREATE POLICY "Landlords can manage, tenants can view"
  ON public.some_table FOR SELECT
  USING (
    -- Landlord access
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
    OR
    -- Tenant access (read-only)
    property_id IN (
      SELECT property_id FROM public.tenants WHERE user_id = auth.uid()
    )
  );
```

### Organization-Based Access

```sql
CREATE POLICY "Organization members can access"
  ON public.some_table FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
    )
  );
```

## Security Best Practices

1. **Always enable RLS** on new tables
2. **Test policies** with both roles
3. **Document policies** in this file
4. **Never bypass RLS** in application code
5. **Use service role** only in Edge Functions (with validation)
6. **Verify dev mode** does not bypass RLS

## Related Documentation

- [Rate Limits](./rate-limits.md) - Rate limiting enforcement
- [Abuse Prevention](./abuse-prevention.md) - Abuse guard implementation
- [Staging-Only Testing](../testing/staging-only.md) - Testing environment security

