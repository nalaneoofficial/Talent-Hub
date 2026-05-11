CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users see own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins see all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  current_location TEXT,
  residential_address TEXT,
  postal_address TEXT,
  highest_education TEXT,
  field_of_study TEXT,
  years_experience INTEGER,
  current_job_title TEXT,
  skills TEXT[],
  industries TEXT[],
  cv_path TEXT,
  cv_filename TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'free',
  subscription_expires_at TIMESTAMPTZ,
  cv_extracted_skills text[],
  cv_extracted_experience_years integer,
  cv_extracted_qualification text,
  cv_summary text,
  ai_consent_at timestamptz,
  institution text,
  graduation_year int,
  preferred_industries text[] DEFAULT '{}',
  onboarding_complete boolean NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  job_type TEXT NOT NULL DEFAULT 'Full-time',
  industry TEXT NOT NULL,
  salary_range TEXT,
  description TEXT NOT NULL,
  skills TEXT[] NOT NULL DEFAULT '{}',
  application_email TEXT,
  posted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  hiring_contact_name text,
  hiring_contact_title text,
  application_deadline timestamptz,
  employment_type text,
  required_years_experience integer,
  required_qualification text,
  required_field_of_study text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view active jobs" ON public.jobs
  FOR SELECT TO authenticated USING (is_active = TRUE OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert jobs" ON public.jobs
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update jobs" ON public.jobs
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete jobs" ON public.jobs
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TYPE public.swipe_action AS ENUM ('like', 'save', 'pass');

CREATE TABLE public.swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  action swipe_action NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own swipes" ON public.swipes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TYPE public.application_status AS ENUM ('draft', 'submitted');

CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'draft',
  cover_letter TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own applications" ON public.applications
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER applications_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  job_id uuid,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.notify_matching_users_on_job()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_active = true THEN
    INSERT INTO public.notifications (user_id, type, title, body, job_id)
    SELECT p.id, 'new_match', 'New job match: ' || NEW.title,
           NEW.company || ' · ' || NEW.location, NEW.id
    FROM public.profiles p
    WHERE p.skills IS NOT NULL AND array_length(p.skills, 1) > 0
      AND EXISTS (
        SELECT 1 FROM unnest(p.skills) ps JOIN unnest(NEW.skills) js
        ON lower(trim(ps)) = lower(trim(js))
      );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_matching_users
  AFTER INSERT ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.notify_matching_users_on_job();

CREATE TABLE public.application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL,
  storage_path text NOT NULL,
  filename text NOT NULL,
  mime_type text,
  size_bytes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own documents" ON public.application_documents
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.job_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.job_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own job views" ON public.job_views
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users see own job views" ON public.job_views
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins see all job views" ON public.job_views
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TABLE public.cv_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  score INTEGER NOT NULL,
  keyword_score INTEGER NOT NULL DEFAULT 0,
  structure_score INTEGER NOT NULL DEFAULT 0,
  readability_score INTEGER NOT NULL DEFAULT 0,
  formatting_score INTEGER NOT NULL DEFAULT 0,
  feedback TEXT,
  cv_filename TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cv_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own analyses" ON public.cv_analyses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all analyses" ON public.cv_analyses
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own analyses" ON public.cv_analyses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_cv_analyses_user ON public.cv_analyses(user_id, created_at DESC);

CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read flags" ON public.feature_flags
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage flags" ON public.feature_flags
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER feature_flags_updated_at BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('beta_mode', true, 'Show beta banner and lock premium features'),
  ('payments_enabled', false, 'Enable real payment processing'),
  ('revamp_enabled', true, 'Allow users to request CV revamp service'),
  ('quick_jobs', false, 'Enable Quick Jobs feature for all users')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE public.revamp_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  current_job_title text,
  target_job_title text,
  notes text,
  cv_path text,
  payment_status text NOT NULL DEFAULT 'pending',
  fulfilment_status text NOT NULL DEFAULT 'new',
  partner_notes text,
  attachment_paths text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.revamp_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users create own revamp requests" ON public.revamp_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own revamp requests" ON public.revamp_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update revamp requests" ON public.revamp_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER revamp_requests_updated_at BEFORE UPDATE ON public.revamp_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.quick_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  location text,
  budget text,
  contact text,
  details jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'pending',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quick_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view approved quick jobs" ON public.quick_jobs
  FOR SELECT TO authenticated
  USING ((status = 'approved' AND is_active = true) OR auth.uid() = poster_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own quick jobs" ON public.quick_jobs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = poster_id);
CREATE POLICY "Users update own quick jobs" ON public.quick_jobs
  FOR UPDATE TO authenticated USING (auth.uid() = poster_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete quick jobs" ON public.quick_jobs
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER quick_jobs_updated_at BEFORE UPDATE ON public.quick_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public) VALUES ('cvs', 'cvs', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('app-docs', 'app-docs', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own CV" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users read own CV" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own CV" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own CV" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users read own app-docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'app-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users insert own app-docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'app-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own app-docs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'app-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own app-docs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'app-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_matching_users_on_job() FROM PUBLIC, anon, authenticated;