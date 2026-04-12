CREATE OR REPLACE FUNCTION public.handle_new_student()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Skip if user has admin or teacher role
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role IN ('admin', 'teacher')) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.students (user_id, name, email, campus_id, class_id, first_name, last_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    (NEW.raw_user_meta_data->>'campus_id')::uuid,
    (NEW.raw_user_meta_data->>'class_id')::uuid,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$function$;