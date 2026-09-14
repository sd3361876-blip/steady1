CREATE TABLE public.pro_trial_claims (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pro_trial_claims TO authenticated;
GRANT ALL ON public.pro_trial_claims TO service_role;

ALTER TABLE public.pro_trial_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trial claim"
ON public.pro_trial_claims
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER pro_trial_claims_updated_at
BEFORE UPDATE ON public.pro_trial_claims
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();