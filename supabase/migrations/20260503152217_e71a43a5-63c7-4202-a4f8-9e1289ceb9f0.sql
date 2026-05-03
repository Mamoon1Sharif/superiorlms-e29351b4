
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS section_id uuid;
ALTER TABLE public.teacher_class_assignments ADD COLUMN IF NOT EXISTS section_id uuid;

CREATE INDEX IF NOT EXISTS idx_students_section_id ON public.students(section_id);
CREATE INDEX IF NOT EXISTS idx_tca_section_id ON public.teacher_class_assignments(section_id);

CREATE OR REPLACE FUNCTION public.handle_new_student()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_student_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role IN ('admin', 'teacher', 'campus_admin')) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.students (
    user_id, name, email, campus_id, class_id, section_id,
    first_name, last_name, phone, reg_no, approval_status
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    (NEW.raw_user_meta_data->>'campus_id')::uuid,
    (NEW.raw_user_meta_data->>'class_id')::uuid,
    (NEW.raw_user_meta_data->>'section_id')::uuid,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'reg_no',
    'Pending'
  )
  RETURNING id INTO new_student_id;

  INSERT INTO public.program_enrollments (student_id, program_id, status)
  VALUES (new_student_id, '00000000-0000-0000-0000-000000000001'::uuid, 'Pending')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;
