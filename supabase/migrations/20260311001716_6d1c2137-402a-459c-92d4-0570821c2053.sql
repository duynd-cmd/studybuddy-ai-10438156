
CREATE TABLE public.task_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.study_tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb DEFAULT '[]'::jsonb,
  score integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own task_reviews" ON public.task_reviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.study_plans(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  front text NOT NULL,
  back text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own flashcards" ON public.flashcards FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.scriba_conversations ADD COLUMN file_name text;
ALTER TABLE public.scriba_conversations ADD COLUMN file_content text;

INSERT INTO storage.buckets (id, name, public) VALUES ('scriba-files', 'scriba-files', false);

CREATE POLICY "Users can upload scriba files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'scriba-files' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can read own scriba files" ON storage.objects FOR SELECT USING (bucket_id = 'scriba-files' AND auth.uid() IS NOT NULL);
