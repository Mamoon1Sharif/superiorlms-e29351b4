
CREATE OR REPLACE FUNCTION public.handle_new_student()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Skip if user has admin role
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role = 'admin') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.students (user_id, name, email, campus_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    (NEW.raw_user_meta_data->>'campus_id')::uuid
  );
  RETURN NEW;
END;
$function$;
