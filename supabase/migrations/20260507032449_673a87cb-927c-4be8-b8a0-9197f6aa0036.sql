
ALTER TABLE public.quick_jobs ADD COLUMN IF NOT EXISTS poster_name text;
ALTER TABLE public.quick_jobs ADD COLUMN IF NOT EXISTS pay_amount numeric;
ALTER TABLE public.quick_jobs ADD COLUMN IF NOT EXISTS pay_type text;
ALTER TABLE public.quick_jobs ADD COLUMN IF NOT EXISTS date_needed date;
ALTER TABLE public.quick_jobs ADD COLUMN IF NOT EXISTS duration text;
ALTER TABLE public.quick_jobs ADD COLUMN IF NOT EXISTS contact_number text;
ALTER TABLE public.quick_jobs ADD COLUMN IF NOT EXISTS posted_by uuid;

UPDATE public.quick_jobs SET posted_by = poster_id WHERE posted_by IS NULL AND poster_id IS NOT NULL;

-- Update RLS to allow either column to identify ownership during transition
DROP POLICY IF EXISTS "Users create own quick jobs" ON public.quick_jobs;
CREATE POLICY "Users create own quick jobs"
ON public.quick_jobs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = posted_by OR auth.uid() = poster_id);

DROP POLICY IF EXISTS "Users update own quick jobs" ON public.quick_jobs;
CREATE POLICY "Users update own quick jobs"
ON public.quick_jobs FOR UPDATE TO authenticated
USING (auth.uid() = posted_by OR auth.uid() = poster_id OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated view approved quick jobs" ON public.quick_jobs;
CREATE POLICY "Authenticated view approved quick jobs"
ON public.quick_jobs FOR SELECT TO authenticated
USING (
  ((status = 'approved'::text) AND (is_active = true))
  OR auth.uid() = posted_by OR auth.uid() = poster_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Make poster_id nullable since code now uses posted_by
ALTER TABLE public.quick_jobs ALTER COLUMN poster_id DROP NOT NULL;
