-- Allow employers (account_type = 'employer') to read limited candidate profiles
-- for the Head Hunt feature. Only exposes users with active subscriptions.
-- Employers cannot see each other's profiles or B2B accounts.

-- Create a security definer function to get the current user's account_type safely without triggering RLS
CREATE OR REPLACE FUNCTION public.get_my_account_type()
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT account_type FROM public.profiles WHERE id = auth.uid();
$$;

CREATE POLICY "Employers view active candidate profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- The viewer must be an employer (uses security definer to avoid infinite recursion)
    public.get_my_account_type() = 'employer'
    -- The row being read must be a regular job-seeker with an active subscription
    AND subscription_status = 'active'
    AND (account_type IS NULL OR account_type NOT IN ('employer', 'quick_jobs'))
    AND id != auth.uid()
  );
