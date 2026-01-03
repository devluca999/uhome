# Tenant Lifecycle

## Overview

Tenant accounts in uhome have a specific lifecycle that ensures data persistence and proper access control. Tenant accounts are **never automatically deleted** and persist even after move-out.

## Tenant Account States

### 1. Invited (No Data Access)

When a tenant is first invited:

- Tenant account may or may not exist yet
- If account doesn't exist, invite creates account
- Account has no linked household
- **No data visible** - tenant sees empty state
- Account persists in system

### 2. Active (Linked to Household)

When tenant is linked to a household:

- Tenant account linked to household via `tenants` table
- Household linked to property
- Tenant can now see:
  - Property information
  - Rent records
  - Maintenance requests
  - Documents
  - Tasks assigned to household
- Multiple tenant users can be in same household

### 3. Unlinked (After Move-Out)

When tenant moves out:

- Household unlinked from property
- Tenant account **persists** in system
- Tenant account **not deleted**
- Tenant sees empty state (no data visible)
- Account can be relinked to new household later

## Household Model

### What is a Household?

A **household** is a group of tenant users that share:

- The same property/unit
- The same rent records
- The same maintenance requests
- The same documents

### Household Examples

- **Single tenant**: One person, one household
- **Couple**: Two tenant users, one household
- **Roommates**: Multiple tenant users, one household
- **Family**: Multiple tenant users, one household

### Household Linking

- Households are linked to properties
- Tenants are linked to households (via `tenants.household_id`)
- When tenant moves out, household is unlinked from property
- Household can be relinked to new property if tenant returns

## Tenant Invitation Flow

### Step 1: Landlord Invites Tenant

```
Landlord → Invite Tenant → Enter email → Generate invite token
```

### Step 2: Tenant Accepts Invite

```
Tenant → Clicks invite link → Creates/Logs into account → Account created
```

### Step 3: Landlord Links Tenant to Household

```
Landlord → Selects property → Creates/Selects household → Links tenant to household
```

### Step 4: Tenant Sees Data

```
Tenant → Logs in → Sees property data → Can interact with features
```

## Move-Out Flow

### Step 1: Landlord Marks Tenant as Moved Out

```
Landlord → Selects tenant → Marks as moved out → Household unlinked from property
```

### Step 2: Tenant Account Persists

```
Tenant account → Remains in system → No data visible → Can be relinked later
```

### Step 3: Relinking (If Tenant Returns)

```
Landlord → Selects existing tenant → Links to new household → Tenant sees data again
```

## Key Principles

1. **Tenant accounts persist** - Never automatically deleted
2. **Household linking required** - Tenant must be linked to household to see data
3. **Multiple tenants per household** - Always allowed, not gated by pricing
4. **Transparent to tenant** - Tenant doesn't see "migration" or "linking" messages
5. **No data loss** - All tenant data preserved even after move-out

## Data Persistence

### What Persists After Move-Out

- Tenant user account
- Tenant profile information
- Historical rent records (if needed)
- Historical maintenance requests (if needed)

### What Gets Unlinked

- Household → Property relationship
- Current access to property data
- Active rent records (moved to historical)

## Tenant Collaboration

### Multiple Tenant Users Per Household

- **Always allowed** - Not a paid feature
- **Not gated by Pro plan** - Free for all
- Examples:
  - Spouses sharing account access
  - Roommates each with their own account
  - Family members with separate logins

### Tenant Permissions

All tenant users in a household have:

- Same property access
- Same rent record visibility
- Same maintenance request access
- Same document access
- Can submit maintenance requests
- Can update rent record status

## Future Considerations

- Tenant account deletion (manual, owner-initiated)
- Tenant data export
- Tenant account merging
- Historical data archiving

