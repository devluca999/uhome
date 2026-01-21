# How to Disable Email Confirmation in Supabase

1. Go to **Supabase Dashboard** → Your Project (staging)
2. Navigate to **Authentication** → **Settings** (or **Email Templates**)
3. Find **"Enable email confirmations"** or **"Confirm email"** setting
4. **Turn it OFF** / **Disable** it
5. Save the settings

Now you can:
- Sign up without needing to confirm email
- Sign up and immediately login
- Then run `set_admin_role_after_signup.sql` to set admin role

## Alternative: Keep email confirmation but confirm manually via SQL

If you want to keep email confirmation enabled, after signup (before confirming email), you can run:

```sql
-- Manually confirm email after signup
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE LOWER(email) = LOWER('getuhome01@gmail.com');
```

Then run `set_admin_role_after_signup.sql` to set admin role.
