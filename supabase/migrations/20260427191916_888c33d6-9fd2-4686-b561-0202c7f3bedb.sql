-- 1. Add campus_admin to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'campus_admin';

-- 2. Add fields to students
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS reg_no text,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

-- 3. Campus admin assignment table
CREATE TABLE IF NOT EXISTS public.campus_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campus_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, campus_id)
);

ALTER TABLE public.campus_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read campus_admins" ON public.campus_admins FOR SELECT USING (true);
CREATE POLICY "Public insert campus_admins" ON public.campus_admins FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update campus_admins" ON public.campus_admins FOR UPDATE USING (true);
CREATE POLICY "Public delete campus_admins" ON public.campus_admins FOR DELETE USING (true);

-- 4. Programs table + Digital Skill Certification record
CREATE TABLE IF NOT EXISTS public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read programs" ON public.programs FOR SELECT USING (true);
CREATE POLICY "Public insert programs" ON public.programs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update programs" ON public.programs FOR UPDATE USING (true);
CREATE POLICY "Public delete programs" ON public.programs FOR DELETE USING (true);

INSERT INTO public.programs (id, name, description)
VALUES ('00000000-0000-0000-0000-000000000001', 'Digital Skill Certification', 'Umbrella certification covering all available courses')
ON CONFLICT (id) DO NOTHING;

-- 5. Program enrollments
CREATE TABLE IF NOT EXISTS public.program_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  program_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'Pending',
  applied_at timestamp with time zone NOT NULL DEFAULT now(),
  approved_at timestamp with time zone,
  approved_by uuid,
  UNIQUE (student_id, program_id)
);

ALTER TABLE public.program_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read program_enrollments" ON public.program_enrollments FOR SELECT USING (true);
CREATE POLICY "Public insert program_enrollments" ON public.program_enrollments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update program_enrollments" ON public.program_enrollments FOR UPDATE USING (true);
CREATE POLICY "Public delete program_enrollments" ON public.program_enrollments FOR DELETE USING (true);
