-- Add career_summary column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS career_summary text;
