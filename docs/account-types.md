# Account Types & Roles

## Overview

uhome has two primary account types: **Landlord** and **Tenant**. These account types determine the user's role in the system and what features they can access.

## Account Types

### Landlord Accounts

Landlords are the paying customers of uhome. They:

- Own or manage rental properties
- Pay for subscriptions (Free or Pro plans)
- Can invite collaborators (Pro plan only)
- Have full access to property management features
- Manage tenant relationships

### Tenant Accounts

Tenants are free users. They:

- Do not pay for the platform
- Must be linked to a household to see data
- Can have multiple tenant users per household (e.g., spouses, roommates)
- Have read-only access to their property information
- Can submit maintenance requests and view rent records

## Organization Model

### Organizations (Workspaces)

- Each landlord account has an **organization** (workspace)
- Organizations are auto-created on first landlord login/access
- Organizations own properties and subscriptions
- One organization per landlord at MVP (future: multi-org support)

### Memberships

Users are linked to organizations via **memberships** with specific roles:

#### Owner
- Full access to organization
- Can manage properties, tenants, maintenance
- Can manage billing and subscriptions
- Can invite collaborators (Pro plan only)
- Can delete organization
- **One owner per organization** (the landlord who created it)

#### Collaborator
- Pro plan feature only
- Can view and manage properties, tenants, maintenance
- **Cannot** manage billing
- **Cannot** delete organization
- **Hard cap: 1 collaborator per organization** (owner + 1 collaborator = 2 max landlord-side users)

#### Tenant
- Read-only access to linked properties
- Can view their household's data
- Can submit maintenance requests
- Can update rent record status
- **Unlimited tenant users per household** (not gated by pricing)

## Key Principles

1. **Pricing never interferes with tenant onboarding** - Tenant invites are always free and unlimited
2. **Pro gates landlord power, not tenant existence** - Pro plan enables collaborator invites, not tenant features
3. **Tenant accounts persist** - Tenant accounts are never deleted automatically, even after move-out
4. **Tenant accounts don't count toward plan limits** - Only landlord-side users (owner + collaborator) count

## Account Lifecycle

### Landlord Account
1. User signs up as landlord
2. Organization auto-created on first access
3. Owner membership created automatically
4. Free subscription created by default
5. Can upgrade to Pro plan to enable collaborator invites

### Tenant Account
1. User signs up as tenant (or accepts tenant invite)
2. Account created but no data visible until linked to household
3. Landlord links tenant to household (via property)
4. Tenant can now see household data
5. If tenant moves out, household unlinked but account persists
6. Account remains but shows no data until linked to new household

## Future Considerations

- Multi-org support: Users can join multiple organizations
- Role matrix UI: Future feature for more granular permissions
- Per-seat billing: Not in MVP, but schema supports it
- Enterprise features: Custom roles and permissions

