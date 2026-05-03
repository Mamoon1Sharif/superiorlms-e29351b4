
-- Backfill: ensure every existing course is linked to every existing campus
INSERT INTO public.course_campuses (course_id, campus_id)
SELECT c.id, ca.id
FROM public.courses c
CROSS JOIN public.campuses ca
ON CONFLICT DO NOTHING;

-- Trigger: when a new course is created, link it to every campus
CREATE OR REPLACE FUNCTION public.assign_course_to_all_campuses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.course_campuses (course_id, campus_id)
  SELECT NEW.id, ca.id FROM public.campuses ca
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_course_all_campuses ON public.courses;
CREATE TRIGGER trg_assign_course_all_campuses
AFTER INSERT ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.assign_course_to_all_campuses();

-- Trigger: when a new campus is created, link all existing courses to it
CREATE OR REPLACE FUNCTION public.assign_campus_to_all_courses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.course_campuses (course_id, campus_id)
  SELECT c.id, NEW.id FROM public.courses c
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_campus_all_courses ON public.campuses;
CREATE TRIGGER trg_assign_campus_all_courses
AFTER INSERT ON public.campuses
FOR EACH ROW EXECUTE FUNCTION public.assign_campus_to_all_courses();
