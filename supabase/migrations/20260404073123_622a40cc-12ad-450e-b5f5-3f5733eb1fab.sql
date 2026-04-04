
-- Campuses
CREATE TABLE public.campuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read campuses" ON public.campuses FOR SELECT USING (true);
CREATE POLICY "Public insert campuses" ON public.campuses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update campuses" ON public.campuses FOR UPDATE USING (true);
CREATE POLICY "Public delete campuses" ON public.campuses FOR DELETE USING (true);

-- Courses
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Public insert courses" ON public.courses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update courses" ON public.courses FOR UPDATE USING (true);
CREATE POLICY "Public delete courses" ON public.courses FOR DELETE USING (true);

-- Course-Campus junction
CREATE TABLE public.course_campuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  campus_id UUID NOT NULL REFERENCES public.campuses(id) ON DELETE CASCADE,
  UNIQUE(course_id, campus_id)
);
ALTER TABLE public.course_campuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read course_campuses" ON public.course_campuses FOR SELECT USING (true);
CREATE POLICY "Public insert course_campuses" ON public.course_campuses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete course_campuses" ON public.course_campuses FOR DELETE USING (true);

-- Modules
CREATE TABLE public.modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('video', 'quiz', 'assignment')),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read modules" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Public insert modules" ON public.modules FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update modules" ON public.modules FOR UPDATE USING (true);
CREATE POLICY "Public delete modules" ON public.modules FOR DELETE USING (true);

-- Students
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  campus_id UUID REFERENCES public.campuses(id),
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Public insert students" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update students" ON public.students FOR UPDATE USING (true);
CREATE POLICY "Public delete students" ON public.students FOR DELETE USING (true);

-- Teachers
CREATE TABLE public.teachers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  campus_id UUID REFERENCES public.campuses(id),
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read teachers" ON public.teachers FOR SELECT USING (true);
CREATE POLICY "Public insert teachers" ON public.teachers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update teachers" ON public.teachers FOR UPDATE USING (true);
CREATE POLICY "Public delete teachers" ON public.teachers FOR DELETE USING (true);

-- Enrollments
CREATE TABLE public.enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  progress INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id)
);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read enrollments" ON public.enrollments FOR SELECT USING (true);
CREATE POLICY "Public insert enrollments" ON public.enrollments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update enrollments" ON public.enrollments FOR UPDATE USING (true);
CREATE POLICY "Public delete enrollments" ON public.enrollments FOR DELETE USING (true);

-- Notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'neutral')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Public insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update notifications" ON public.notifications FOR UPDATE USING (true);

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_campuses_updated_at BEFORE UPDATE ON public.campuses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
