# Supabase Schema Setup

This folder contains the database schema for haume.

## Quick Setup

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Open the `schema.sql` file from this folder
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)

## What This Creates

- **users** - Extended user profiles with roles (landlord/tenant)
- **properties** - Property listings with rent info
- **tenants** - Tenant-property relationships
- **maintenance_requests** - Maintenance request tracking
- **documents** - Document storage (leases, notices, etc.)
- **rent_records** - Rent payment tracking

## Security Features

All tables have Row Level Security (RLS) enabled with policies that:
- Landlords can only access their own properties and related data
- Tenants can only access their own data and properties they're assigned to
- Automatic user record creation on signup (via trigger)

## Important Notes

- The `handle_new_user()` trigger automatically creates a user record in `public.users` when someone signs up via Supabase Auth
- By default, new users are created with role 'tenant' - this should be updated in your signup flow
- All foreign keys use CASCADE delete for data integrity

