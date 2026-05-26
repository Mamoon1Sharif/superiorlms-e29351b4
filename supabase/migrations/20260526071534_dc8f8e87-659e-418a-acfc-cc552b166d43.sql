-- Allow teachers to update students in their assigned class/section
CREATE OR REPLACE FUNCTION public.teacher_can_access_student(_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teachers t
    JOIN public.teacher_class_assignments tca ON tca.teacher_id = t.id
    JOIN public.students s ON s.id = _student_id
    WHERE t.user_id = auth.uid()
      AND tca.class_id = s.class_id
      AND (tca.section_id IS NULL OR tca.section_id = s.section_id)
  );
$$;

CREATE POLICY "Teachers can update their assigned students"
ON public.students
FOR UPDATE
TO authenticated
USING (public.teacher_can_access_student(id))
WITH CHECK (public.teacher_can_access_student(id));
