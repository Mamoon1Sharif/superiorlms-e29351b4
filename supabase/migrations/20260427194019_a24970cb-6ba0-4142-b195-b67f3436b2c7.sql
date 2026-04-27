ALTER TABLE public.campus_admins
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE public.campus_admins ca
SET
  name = COALESCE(ca.name, au.raw_user_meta_data->>'full_name', au.email),
  email = COALESCE(ca.email, au.email)
FROM auth.users au
WHERE ca.user_id = au.id
  AND (ca.name IS NULL OR ca.email IS NULL);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'campus_admins_campus_id_fkey'
      AND conrelid = 'public.campus_admins'::regclass
  ) THEN
    ALTER TABLE public.campus_admins
    ADD CONSTRAINT campus_admins_campus_id_fkey
    FOREIGN KEY (campus_id) REFERENCES public.campuses(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_campus_admins_campus_id ON public.campus_admins(campus_id);
CREATE INDEX IF NOT EXISTS idx_campus_admins_user_id ON public.campus_admins(user_id);