-- Add full_name column to users table for display purposes
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
