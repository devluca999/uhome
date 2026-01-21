-- Test signup without trigger (temporarily disable)
-- Run this in Supabase SQL Editor to test if trigger is causing the 500 error

-- Disable the trigger temporarily
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- Now try signing up through the app
-- If signup works now, the trigger is the problem
-- If signup still fails, the problem is elsewhere

-- To re-enable the trigger later, run:
-- ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- After re-enabling, make sure you've run fix_signup_trigger_final.sql first
