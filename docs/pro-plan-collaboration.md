# Pro Plan Collaboration

## Overview

The Pro plan enables minimal team capability for landlords. It allows **one additional collaborator** (hard cap of 2 landlord-side users: owner + 1 collaborator).

## Pro Plan Collaboration Rules

### Hard Cap: 2 Landlord-Side Users

- **Owner**: The landlord who created the organization
- **Collaborator**: One additional user (Pro plan only)
- **Total**: Maximum 2 landlord-side users per organization

### Why This Limit?

- MVP does not include full multi-user or team plans
- Pro plan is intended for:
  - Partners
  - Spouses
  - Family members
  - Trusted assistants
- Not intended for large teams (future: enterprise plans)

## Collaborator Permissions

### What Collaborators CAN Do

- ✅ View and manage properties
- ✅ View and manage tenants
- ✅ View and manage maintenance requests
- ✅ Create and update tasks
- ✅ Upload documents
- ✅ Create rent records
- ✅ View all organization data
- ✅ Invite tenants (always allowed)

### What Collaborators CANNOT Do

- ❌ Manage billing
- ❌ View or modify subscriptions
- ❌ Delete organization
- ❌ Invite other collaborators (only owner can)
- ❌ Change organization settings
- ❌ Remove owner membership

## Invitation Flow

### Step 1: Check Pro Plan

```
Owner → Checks subscription → Must be Pro plan → Can invite collaborator
```

### Step 2: Check Collaborator Limit

```
System → Checks landlord count → Must be < 2 → Allows invite
```

### Step 3: Invite Collaborator

```
Owner → Invites collaborator → Collaborator accepts → Membership created
```

### Step 4: Collaborator Access

```
Collaborator → Logs in → Sees organization data → Can manage properties/tenants
```

## Enforcement

### Application-Level Checks

The system enforces Pro plan collaborator limits via:

1. **Database Function**: `can_add_collaborator(org_id)`
   - Checks if organization has Pro plan
   - Checks if landlord count < 2
   - Returns boolean

2. **Application Logic**: Before creating membership
   ```typescript
   if (!canInviteCollaborator(orgId)) {
     throw new Error('Pro plan required and collaborator limit reached');
   }
   ```

### RLS Policies

- Collaborators can access organization data via RLS policies
- Collaborators cannot access subscriptions (billing restricted)
- Collaborators cannot delete organization

## Tenant Collaboration (Separate)

### Important Distinction

**Tenant collaboration is NOT the same as collaborator invites:**

- **Collaborator**: Landlord-side user (Pro plan, limited to 1)
- **Tenant**: Tenant-side user (always free, unlimited per household)

### Tenant Collaboration Rules

- Multiple tenant users per household: **Always allowed**
- Not gated by Pro plan
- Not counted toward collaborator limit
- Free for all organizations

## UI/UX Guidelines

### Invite Flow Language

**DO:**
- "Invite partner"
- "Invite collaborator"
- "Add team member" (if clear it's landlord-side)

**DON'T:**
- "Invite team member" (ambiguous)
- "Add seat" (sounds like per-seat billing)
- "Invite user" (too generic)

### Copy to Include

- "No need to share passwords"
- "Your partner can manage properties with you"
- "Pro plan required for collaborator invites"

### Error Messages

**When Pro plan required:**
```
"Upgrade to Pro plan to invite a collaborator"
```

**When limit reached:**
```
"Pro plan allows one collaborator. You've reached the limit."
```

## Future Considerations

### What's NOT in MVP

- ❌ Role matrix UI
- ❌ Per-seat billing
- ❌ More than 1 collaborator
- ❌ Custom permissions per collaborator
- ❌ Approval workflows

### What's Planned for Future

- Enterprise plans with more collaborators
- Role-based permissions matrix
- Per-seat billing for larger teams
- Team management UI

## Key Principles

1. **Pro gates collaborator invites** - Not tenant features
2. **Hard cap of 2** - Owner + 1 collaborator maximum
3. **Collaborators are limited** - Cannot manage billing or delete org
4. **Tenant collaboration is separate** - Always free and unlimited
5. **No per-seat billing** - Flat Pro plan price, not per-user

