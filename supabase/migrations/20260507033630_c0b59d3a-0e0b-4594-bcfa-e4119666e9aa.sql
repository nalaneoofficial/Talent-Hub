-- Add revamped CV fields
ALTER TABLE public.revamp_requests
  ADD COLUMN IF NOT EXISTS revamped_cv_path text,
  ADD COLUMN IF NOT EXISTS revamped_cv_filename text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Trigger to notify user when their revamp is delivered
CREATE OR REPLACE FUNCTION public.notify_user_on_revamp_delivered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.fulfilment_status = 'delivered'
     AND (OLD.fulfilment_status IS DISTINCT FROM 'delivered') THEN
    NEW.delivered_at := now();
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (
      NEW.user_id,
      'revamp_delivered',
      'Your revamped CV is ready! ✨',
      'Your partner coach has completed your CV revamp. Open CV & Documents to view it.'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_user_on_revamp_delivered ON public.revamp_requests;
CREATE TRIGGER trg_notify_user_on_revamp_delivered
BEFORE UPDATE ON public.revamp_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_user_on_revamp_delivered();

-- Storage policies on 'cvs' bucket so partners & admins can upload revamped CVs
-- and users can read their own folder.
DO $$ BEGIN
  CREATE POLICY "Partners and admins upload to cvs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cvs'
    AND (public.has_role(auth.uid(), 'admin'::app_role)
         OR public.has_role(auth.uid(), 'partner'::app_role))
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Partners and admins read cvs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'cvs'
    AND (public.has_role(auth.uid(), 'admin'::app_role)
         OR public.has_role(auth.uid(), 'partner'::app_role))
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users read own cvs folder"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'cvs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;