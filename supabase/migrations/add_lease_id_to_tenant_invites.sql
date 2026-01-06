-- Add lease_id to tenant_invites table
-- This links invites to the draft leases they create

-- Step 1: Add lease_id column
ALTER TABLE public.tenant_invites
ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_tenant_invites_lease_id ON public.tenant_invites(lease_id);

-- Step 3: Update RLS policies to allow viewing lease via invite
-- The existing policies should work, but we can add a policy for viewing via lease_id
-- (Existing policies already allow landlords to view their invites)

-- Step 4: Add comment
COMMENT ON COLUMN public.tenant_invites.lease_id IS 'Draft lease created automatically when invite is generated. Links invite to lease for tenant acceptance flow.';

