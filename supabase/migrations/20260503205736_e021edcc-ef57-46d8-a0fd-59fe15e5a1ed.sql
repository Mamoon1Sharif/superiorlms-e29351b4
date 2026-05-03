-- Allow multiple sections per (teacher, class), and add FK for section_id
ALTER TABLE public.teacher_class_assignments
  DROP CONSTRAINT IF EXISTS teacher_class_assignments_teacher_id_class_id_key;

ALTER TABLE public.teacher_class_assignments
  ADD CONSTRAINT teacher_class_assignments_section_id_fkey
  FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE CASCADE;

-- Unique per teacher/class/section (treat null section as its own slot)
CREATE UNIQUE INDEX IF NOT EXISTS teacher_class_assignments_unique_idx
  ON public.teacher_class_assignments (teacher_id, class_id, COALESCE(section_id, '00000000-0000-0000-0000-000000000000'::uuid));