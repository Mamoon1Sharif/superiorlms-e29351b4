CREATE POLICY "Admins can update students" ON public.students FOR UPDATE TO authenticated USING (public.get_user_role(auth.uid()) = 'admin') WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update teachers" ON public.teachers FOR UPDATE TO authenticated USING (public.get_user_role(auth.uid()) = 'admin') WITH CHECK (public.get_user_role(auth.uid()) = 'admin');