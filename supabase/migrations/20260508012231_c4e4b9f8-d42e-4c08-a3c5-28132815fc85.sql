
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'premium';
ALTER TABLE public.revamp_requests ADD COLUMN IF NOT EXISTS revamp_level text;
ALTER TABLE public.revamp_requests ADD COLUMN IF NOT EXISTS revamp_amount numeric;

INSERT INTO public.feature_flags (key, enabled) VALUES ('subscription_required', false) ON CONFLICT (key) DO NOTHING;
INSERT INTO public.feature_flags (key, enabled) VALUES ('cv_revamp_payments', false) ON CONFLICT (key) DO NOTHING;
INSERT INTO public.feature_flags (key, enabled) VALUES ('quick_jobs_payments', false) ON CONFLICT (key) DO NOTHING;
