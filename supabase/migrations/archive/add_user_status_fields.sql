-- Add user status fields to users table for admin actions
-- Run this in Supabase SQL Editor
-- IMPORTANT: This adds status tracking fields for ban, lock, and suspend actions
-- This script is idempotent - safe to run multiple times

-- ============================================================================
-- STEP 1: CREATE ENUM TYPE FOR ACCOUNT STATUS
-- ============================================================================

-- Create account_status enum type if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
    CREATE TYPE account_status AS ENUM ('active', 'suspended', 'banned', 'locked');
  END IF;
END $$;

-- ============================================================================
-- STEP 2: ADD STATUS COLUMNS TO USERS TABLE
-- ============================================================================

-- Add account_status column (defaults to 'active' for existing users)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS account_status account_status DEFAULT 'active';

-- Add is_locked column (for temporary locks)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

-- Add locked_until column (optional expiration time for locks)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;

-- Add banned_at column (timestamp when user was banned)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;

-- Add suspended_at column (timestamp when user was suspended)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- STEP 3: UPDATE EXISTING USERS TO HAVE ACTIVE STATUS
-- ============================================================================

-- Set all existing users to 'active' status (if they don't have one)
UPDATE public.users 
SET account_status = 'active' 
WHERE account_status IS NULL;

-- ============================================================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index on account_status for filtering
CREATE INDEX IF NOT EXISTS idx_users_account_status ON public.users(account_status);

-- Index on is_locked for filtering locked users
CREATE INDEX IF NOT EXISTS idx_users_is_locked ON public.users(is_locked) WHERE is_locked = true;

-- Index on locked_until for finding expired locks
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON public.users(locked_until) WHERE locked_until IS NOT NULL;

-- Composite index for common queries (status + role)
CREATE INDEX IF NOT EXISTS idx_users_status_role ON public.users(account_status, role);

-- ============================================================================
-- STEP 5: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN public.users.account_status IS 'Account status: active (normal), suspended (temporary restriction), banned (permanent ban), locked (temporary lock)';
COMMENT ON COLUMN public.users.is_locked IS 'Whether the account is temporarily locked (can be auto-expired via locked_until)';
COMMENT ON COLUMN public.users.locked_until IS 'Optional expiration time for temporary locks. If NULL, lock is indefinite until manually unlocked.';
COMMENT ON COLUMN public.users.banned_at IS 'Timestamp when the user was banned. NULL if user has never been banned.';
COMMENT ON COLUMN public.users.suspended_at IS 'Timestamp when the user was suspended. NULL if user has never been suspended.';

-- ============================================================================
-- STEP 6: CREATE FUNCTION TO AUTO-UNLOCK EXPIRED LOCKS
-- ============================================================================

-- Function to unlock users whose lock has expired
CREATE OR REPLACE FUNCTION public.unlock_expired_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Unlock users where locked_until has passed
  UPDATE public.users
  SET 
    is_locked = false,
    locked_until = NULL,
    account_status = 'active',
    updated_at = NOW()
  WHERE 
    is_locked = true
    AND locked_until IS NOT NULL
    AND locked_until < NOW();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.unlock_expired_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_expired_users() TO service_role;

-- Add comment
COMMENT ON FUNCTION public.unlock_expired_users() IS 'Unlocks users whose lock expiration time (locked_until) has passed. Should be called periodically via cron job or scheduled task.';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE 'User status fields added successfully. All existing users have been set to active status.';
  RAISE NOTICE 'Remember to:';
  RAISE NOTICE '  1. Set up a cron job or scheduled task to call unlock_expired_users() periodically';
  RAISE NOTICE '  2. Update application code to check account_status before allowing user actions';
  RAISE NOTICE '  3. Enforce account_status in authentication middleware';
END $$;