# Quick Start Guide

## 1. Set Up Database Schema

1. Open your Supabase project: https://supabase.com/dashboard
2. Go to **SQL Editor**
3. Open `supabase/schema.sql` from this project
4. Copy **ALL** the SQL (entire file)
5. Paste into Supabase SQL Editor
6. Click **Run** (or press Ctrl+Enter)

This creates all tables, RLS policies, indexes, and triggers needed for haume.

## 2. Start the App

```bash
npm run dev
```

The app will start at `http://localhost:5173`

## 3. Test Authentication

1. Go to `http://localhost:5173/signup`
2. Select your role (Landlord or Tenant)
3. Enter email and password
4. Click "Create Account"
5. You'll be redirected to your role-specific dashboard

## 4. Test Login

1. Go to `http://localhost:5173/login`
2. Enter your credentials
3. Sign in

## What's Working

✅ User authentication (email/password)  
✅ Role-based access control  
✅ Protected routes  
✅ Landlord dashboard  
✅ Tenant dashboard  
✅ Sign up / Sign in / Sign out  

## Next Steps

- Create properties (landlord)
- Add tenants to properties
- Submit maintenance requests
- Upload documents

---

**Note:** For Google OAuth, you'll need to configure it in Supabase Dashboard → Authentication → Providers → Google

