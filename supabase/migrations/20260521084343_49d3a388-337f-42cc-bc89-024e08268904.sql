DELETE FROM public.program_enrollments pe
WHERE NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id = pe.student_id);

INSERT INTO public.program_enrollments (student_id, program_id, status)
SELECT s.id, '00000000-0000-0000-0000-000000000001'::uuid, 'Pending'
FROM public.students s
WHERE NOT EXISTS (
  SELECT 1 FROM public.program_enrollments pe WHERE pe.student_id = s.id
);