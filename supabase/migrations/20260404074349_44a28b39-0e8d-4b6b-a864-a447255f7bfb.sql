
-- Lessons (video content within modules)
CREATE TABLE public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  youtube_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read lessons" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Public insert lessons" ON public.lessons FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update lessons" ON public.lessons FOR UPDATE USING (true);
CREATE POLICY "Public delete lessons" ON public.lessons FOR DELETE USING (true);

-- Quiz questions within modules
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read quiz_questions" ON public.quiz_questions FOR SELECT USING (true);
CREATE POLICY "Public insert quiz_questions" ON public.quiz_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update quiz_questions" ON public.quiz_questions FOR UPDATE USING (true);
CREATE POLICY "Public delete quiz_questions" ON public.quiz_questions FOR DELETE USING (true);

-- Assignment details within modules
CREATE TABLE public.assignment_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  instructions TEXT NOT NULL,
  deadline TIMESTAMPTZ,
  max_marks INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assignment_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read assignment_details" ON public.assignment_details FOR SELECT USING (true);
CREATE POLICY "Public insert assignment_details" ON public.assignment_details FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update assignment_details" ON public.assignment_details FOR UPDATE USING (true);
CREATE POLICY "Public delete assignment_details" ON public.assignment_details FOR DELETE USING (true);
