-- Drop the policy causing infinite recursion
DROP POLICY IF EXISTS "Employers view active candidate profiles" ON public.profiles;

-- Create a security definer function to get the current user's account_type safely without triggering RLS
CREATE OR REPLACE FUNCTION public.get_my_account_type()
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT account_type FROM public.profiles WHERE id = auth.uid();
$$;

-- Recreate the policy without recursion using the function
CREATE POLICY "Employers view active candidate profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_account_type() = 'employer'
    AND subscription_status = 'active'
    AND (account_type IS NULL OR account_type NOT IN ('employer', 'quick_jobs'))
    AND id != auth.uid()
  );
