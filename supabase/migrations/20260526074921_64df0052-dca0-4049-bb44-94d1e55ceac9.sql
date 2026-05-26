CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS TABLE(courses bigint, students bigint, campuses bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM public.courses),
    (SELECT count(*) FROM public.students),
    (SELECT count(*) FROM public.campuses);
$$;
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated;