
-- ============================================================
-- Security hardening migration
-- ============================================================

-- 1. Helper function: has_role (avoids recursive RLS on user_roles)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = _role
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.teacher_can_access_student(uuid) FROM anon;

-- Helper: campus_admin's campus
CREATE OR REPLACE FUNCTION public.campus_admin_campus_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT campus_id FROM public.campus_admins WHERE user_id = _user_id LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.campus_admin_campus_id(uuid) FROM anon;

-- Helper: current user's student id
CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.students WHERE user_id = auth.uid() LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.current_student_id() FROM anon;

-- ============================================================
-- 2. user_roles: remove public insert (privilege escalation)
-- ============================================================
DROP POLICY IF EXISTS "Service can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3. students: restrict SELECT (PII)
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read students" ON public.students;
CREATE POLICY "Students read own" ON public.students
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admins read all students" ON public.students
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Campus admins read campus students" ON public.students
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'campus_admin') AND campus_id = public.campus_admin_campus_id(auth.uid()));
CREATE POLICY "Teachers read assigned students" ON public.students
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND public.teacher_can_access_student(id));

-- ============================================================
-- 4. teachers: restrict to authenticated; mutations admin/campus_admin
-- ============================================================
DROP POLICY IF EXISTS "Public read teachers" ON public.teachers;
DROP POLICY IF EXISTS "Public insert teachers" ON public.teachers;
DROP POLICY IF EXISTS "Public update teachers" ON public.teachers;
DROP POLICY IF EXISTS "Public delete teachers" ON public.teachers;

CREATE POLICY "Authenticated read teachers" ON public.teachers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage teachers" ON public.teachers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Campus admins manage own campus teachers" ON public.teachers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'campus_admin') AND campus_id = public.campus_admin_campus_id(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'campus_admin') AND campus_id = public.campus_admin_campus_id(auth.uid()));

-- ============================================================
-- 5. campus_admins: admin only (incl reads), self read
-- ============================================================
DROP POLICY IF EXISTS "Public read campus_admins" ON public.campus_admins;
DROP POLICY IF EXISTS "Public insert campus_admins" ON public.campus_admins;
DROP POLICY IF EXISTS "Public update campus_admins" ON public.campus_admins;
DROP POLICY IF EXISTS "Public delete campus_admins" ON public.campus_admins;

CREATE POLICY "Self read campus_admins" ON public.campus_admins
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage campus_admins" ON public.campus_admins
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 6. enrollments: restrict mutations, restrict SELECT
-- ============================================================
DROP POLICY IF EXISTS "Admin can delete enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admin can update enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Anyone can read enrollments" ON public.enrollments;

CREATE POLICY "Authenticated read enrollments" ON public.enrollments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage enrollments" ON public.enrollments
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'campus_admin') OR public.has_role(auth.uid(), 'teacher'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'campus_admin') OR public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Admins delete enrollments" ON public.enrollments
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'campus_admin'));

-- ============================================================
-- 7. assignment_submissions: restrict SELECT and UPDATE
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Admin can update submissions" ON public.assignment_submissions;

CREATE POLICY "Students read own submissions" ON public.assignment_submissions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "Teachers read assigned submissions" ON public.assignment_submissions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND public.teacher_can_access_student(student_id));
CREATE POLICY "Admin staff read submissions" ON public.assignment_submissions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'campus_admin'));
CREATE POLICY "Staff update submissions" ON public.assignment_submissions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'campus_admin') OR (public.has_role(auth.uid(), 'teacher') AND public.teacher_can_access_student(student_id)))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'campus_admin') OR (public.has_role(auth.uid(), 'teacher') AND public.teacher_can_access_student(student_id)));

-- ============================================================
-- 8. capstone_submissions: restrict SELECT
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read capstone submissions" ON public.capstone_submissions;

CREATE POLICY "Students read own capstone" ON public.capstone_submissions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "Teachers read assigned capstone" ON public.capstone_submissions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND public.teacher_can_access_student(student_id));
CREATE POLICY "Admin staff read capstone" ON public.capstone_submissions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'campus_admin'));

-- ============================================================
-- 9. quiz_attempts: restrict SELECT
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read quiz_attempts" ON public.quiz_attempts;

CREATE POLICY "Students read own attempts" ON public.quiz_attempts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "Teachers read assigned attempts" ON public.quiz_attempts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND public.teacher_can_access_student(student_id));
CREATE POLICY "Admin staff read attempts" ON public.quiz_attempts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'campus_admin'));

-- ============================================================
-- 10. student_progress: restrict SELECT
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read progress" ON public.student_progress;

CREATE POLICY "Students read own progress" ON public.student_progress
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "Teachers read assigned progress" ON public.student_progress
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND public.teacher_can_access_student(student_id));
CREATE POLICY "Admin staff read progress" ON public.student_progress
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'campus_admin'));

-- ============================================================
-- 11. program_enrollments: restrict mutations and SELECT
-- ============================================================
DROP POLICY IF EXISTS "Public read program_enrollments" ON public.program_enrollments;
DROP POLICY IF EXISTS "Public insert program_enrollments" ON public.program_enrollments;
DROP POLICY IF EXISTS "Public update program_enrollments" ON public.program_enrollments;
DROP POLICY IF EXISTS "Public delete program_enrollments" ON public.program_enrollments;

CREATE POLICY "Students read own program enrollment" ON public.program_enrollments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "Staff read program enrollments" ON public.program_enrollments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'campus_admin') OR public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Students insert own program enrollment" ON public.program_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "Admin staff manage program enrollments" ON public.program_enrollments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'campus_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'campus_admin'));

-- ============================================================
-- 12. notifications: restrict
-- ============================================================
DROP POLICY IF EXISTS "Public read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Public insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Public update notifications" ON public.notifications;

CREATE POLICY "Authenticated read notifications" ON public.notifications
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'campus_admin'));
CREATE POLICY "Admins update notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'campus_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'campus_admin'));

-- ============================================================
-- 13. Schema/content tables: keep public reads, restrict writes to admin
-- ============================================================
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['assignment_details','campuses','courses','lessons','modules','programs','quiz_questions','regions','course_campuses'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public insert %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Public update %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Public delete %s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Admins manage %s" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))', t, t);
  END LOOP;
END $$;

-- classes, sections, teacher_class_assignments: admin or campus_admin can mutate
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['classes','sections','teacher_class_assignments'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public insert %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Public update %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Public delete %s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Admin staff manage %s" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'') OR public.has_role(auth.uid(), ''campus_admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin'') OR public.has_role(auth.uid(), ''campus_admin''))', t, t);
  END LOOP;
END $$;

-- ============================================================
-- 14. Storage: course-covers writes admin-only
-- ============================================================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (qual LIKE '%course-covers%' OR with_check LIKE '%course-covers%')
      AND cmd IN ('INSERT','UPDATE','DELETE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Admins manage course-covers"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'course-covers' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'course-covers' AND public.has_role(auth.uid(), 'admin'));
