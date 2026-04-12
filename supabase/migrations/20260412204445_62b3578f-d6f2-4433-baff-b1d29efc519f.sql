
-- Table to assign teachers to specific classes
CREATE TABLE public.teacher_class_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, class_id)
);

ALTER TABLE public.teacher_class_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read teacher_class_assignments" ON public.teacher_class_assignments FOR SELECT USING (true);
CREATE POLICY "Public insert teacher_class_assignments" ON public.teacher_class_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete teacher_class_assignments" ON public.teacher_class_assignments FOR DELETE USING (true);
CREATE POLICY "Public update teacher_class_assignments" ON public.teacher_class_assignments FOR UPDATE USING (true);

-- Add grading comments to assignment_submissions
ALTER TABLE public.assignment_submissions ADD COLUMN grading_comments TEXT DEFAULT '';
