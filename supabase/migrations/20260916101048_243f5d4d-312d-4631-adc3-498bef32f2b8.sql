ALTER TABLE public.questionnaire_answers
  ADD COLUMN IF NOT EXISTS commitment_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS commitment_drawing TEXT;