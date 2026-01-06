# Messaging System - Quick Start Guide

## Where to Access Messaging

### For Tenants:
1. **Dashboard**: Click "Message Landlord" button on `/tenant/dashboard`
2. **Maintenance Page**: Click "Message Landlord" button on `/tenant/maintenance` (pre-filled with `intent=maintenance`)
3. **Direct URL**: Navigate to `/tenant/lease?tab=messages`

### For Landlords:
1. **Property Detail Page**: Click "View Messages" button on any lease card
2. **Direct URL**: Navigate to `/landlord/leases/:leaseId?tab=messages`

## Prerequisites

To use messaging, you need:
1. **A lease must exist** - The messaging system requires a lease record
2. **Active user accounts** - Both tenant and landlord must be authenticated
3. **Database migrations run** - All 5 migration files must be executed (see `supabase/migrations/MESSAGING_MIGRATION.md`)

## Troubleshooting

### "No lease found" Error

If you see "No lease found" when trying to access messaging:

**For Tenants:**
- Ensure a `lease` record exists in the database with `tenant_id` matching your tenant record
- The lease must reference a property and a tenant

**For Landlords:**
- Ensure you have at least one property with an associated lease
- The lease must have a valid `tenant_id` and `property_id`

### Testing Messaging

1. **Create a Lease** (if you don't have one):
   - As a landlord, go to a property detail page
   - Click "Add Lease" 
   - Fill in lease details and save

2. **Access Messages**:
   - As tenant: Click "Message Landlord" from dashboard
   - As landlord: Click "View Messages" on a lease card

3. **Send a Test Message**:
   - Type a message in the composer
   - Select an intent (General, Maintenance, Billing, Notice)
   - Click "Send"

### Database Check

Verify your setup:

```sql
-- Check if leases exist
SELECT id, property_id, tenant_id FROM leases LIMIT 5;

-- Check if messages table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'messages';

-- Check if notifications table exists  
SELECT table_name FROM information_schema.tables WHERE table_name = 'notifications';
```

## Common Issues

1. **Messages not showing**: Check that RLS policies are properly set (run `create_messages_rls.sql`)
2. **Can't send messages**: Verify lease is active (not past end date)
3. **Notifications not appearing**: Check trigger is created (run `create_message_triggers.sql`)

