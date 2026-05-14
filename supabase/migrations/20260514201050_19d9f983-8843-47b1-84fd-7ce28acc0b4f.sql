-- Capstone settings (singleton row keyed by boolean id)
CREATE TABLE public.capstone_settings (
  id boolean PRIMARY KEY DEFAULT true,
  title text NOT NULL DEFAULT 'Final Capstone Project',
  instructions text NOT NULL DEFAULT '',
  max_file_size_mb integer NOT NULL DEFAULT 25,
  deadline timestamptz,
  is_published boolean NOT NULL DEFAULT false,
  cover_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT capstone_settings_singleton CHECK (id = true)
);

ALTER TABLE public.capstone_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read capstone settings"
ON public.capstone_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can insert capstone settings"
ON public.capstone_settings FOR INSERT TO authenticated
WITH CHECK (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update capstone settings"
ON public.capstone_settings FOR UPDATE TO authenticated
USING (get_user_role(auth.uid()) = 'admin')
WITH CHECK (get_user_role(auth.uid()) = 'admin');

CREATE TRIGGER trg_capstone_settings_updated
BEFORE UPDATE ON public.capstone_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.capstone_settings (id, instructions)
VALUES (true, 'Submit your portfolio links, project files, and proof of earnings to complete the program.')
ON CONFLICT DO NOTHING;

-- Capstone submissions
CREATE TABLE public.capstone_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  profile_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Pending',
  grade integer,
  grading_comments text DEFAULT '',
  graded boolean NOT NULL DEFAULT false,
  graded_by uuid,
  graded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id)
);

ALTER TABLE public.capstone_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read capstone submissions"
ON public.capstone_submissions FOR SELECT USING (true);

CREATE POLICY "Students can insert own capstone submission"
ON public.capstone_submissions FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM students WHERE students.id = capstone_submissions.student_id AND students.user_id = auth.uid()));

CREATE POLICY "Students can update own capstone submission"
ON public.capstone_submissions FOR UPDATE
USING (EXISTS (SELECT 1 FROM students WHERE students.id = capstone_submissions.student_id AND students.user_id = auth.uid()));

CREATE POLICY "Teachers and admins can update capstone submissions"
ON public.capstone_submissions FOR UPDATE TO authenticated
USING (get_user_role(auth.uid()) IN ('admin','teacher','campus_admin'))
WITH CHECK (get_user_role(auth.uid()) IN ('admin','teacher','campus_admin'));

CREATE TRIGGER trg_capstone_submissions_updated
BEFORE UPDATE ON public.capstone_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for capstone files
INSERT INTO storage.buckets (id, name, public)
VALUES ('capstone-files', 'capstone-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read capstone files"
ON storage.objects FOR SELECT
USING (bucket_id = 'capstone-files');

CREATE POLICY "Authenticated can upload capstone files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'capstone-files');

CREATE POLICY "Authenticated can update own capstone files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'capstone-files');

CREATE POLICY "Authenticated can delete capstone files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'capstone-files');