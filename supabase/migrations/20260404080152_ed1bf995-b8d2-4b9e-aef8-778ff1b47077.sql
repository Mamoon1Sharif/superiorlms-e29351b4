
-- Track completion of each content item
CREATE TABLE public.student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  module_id UUID NOT NULL,
  item_type TEXT NOT NULL, -- 'lesson', 'quiz', 'assignment'
  item_id UUID NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, item_id)
);

ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read progress" ON public.student_progress FOR SELECT USING (true);
CREATE POLICY "Students can insert own progress" ON public.student_progress FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM students WHERE students.id = student_progress.student_id AND students.user_id = auth.uid()));
CREATE POLICY "Students can update own progress" ON public.student_progress FOR UPDATE
  USING (EXISTS (SELECT 1 FROM students WHERE students.id = student_progress.student_id AND students.user_id = auth.uid()));

-- Quiz attempts
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  module_id UUID NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read quiz_attempts" ON public.quiz_attempts FOR SELECT USING (true);
CREATE POLICY "Students can insert own quiz_attempts" ON public.quiz_attempts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM students WHERE students.id = quiz_attempts.student_id AND students.user_id = auth.uid()));

-- Assignment submissions
CREATE TABLE public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  assignment_id UUID NOT NULL,
  submission_text TEXT NOT NULL DEFAULT '',
  grade INTEGER,
  graded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, assignment_id)
);

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read submissions" ON public.assignment_submissions FOR SELECT USING (true);
CREATE POLICY "Students can insert own submissions" ON public.assignment_submissions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM students WHERE students.id = assignment_submissions.student_id AND students.user_id = auth.uid()));
CREATE POLICY "Students can update own submissions" ON public.assignment_submissions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM students WHERE students.id = assignment_submissions.student_id AND students.user_id = auth.uid()));
CREATE POLICY "Admin can update submissions" ON public.assignment_submissions FOR UPDATE USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_student_progress_updated_at BEFORE UPDATE ON public.student_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assignment_submissions_updated_at BEFORE UPDATE ON public.assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
