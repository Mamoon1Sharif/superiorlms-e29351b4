-- Auto-approve all existing students
UPDATE public.students SET approval_status='Approved', approved_at=COALESCE(approved_at, now()) WHERE approval_status<>'Approved';

-- Auto-approve all existing program enrollments
UPDATE public.program_enrollments SET status='Approved', approved_at=COALESCE(approved_at, now()) WHERE status<>'Approved';

-- Create approved program enrollments for any approved student missing one (for the Digital Skill Certification program)
INSERT INTO public.program_enrollments (student_id, program_id, status, approved_at, applied_at)
SELECT s.id, '00000000-0000-0000-0000-000000000001'::uuid, 'Approved', now(), now()
FROM public.students s
WHERE s.approval_status='Approved'
  AND NOT EXISTS (
    SELECT 1 FROM public.program_enrollments pe
    WHERE pe.student_id=s.id AND pe.program_id='00000000-0000-0000-0000-000000000001'::uuid
  );