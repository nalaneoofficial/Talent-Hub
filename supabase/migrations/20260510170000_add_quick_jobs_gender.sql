-- Add preferred_gender to quick_jobs
ALTER TABLE public.quick_jobs ADD COLUMN IF NOT EXISTS preferred_gender text DEFAULT 'Any';
