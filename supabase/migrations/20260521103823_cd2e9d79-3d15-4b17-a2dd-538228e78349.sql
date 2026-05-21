ALTER TABLE public.program_enrollments
  ADD CONSTRAINT program_enrollments_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;