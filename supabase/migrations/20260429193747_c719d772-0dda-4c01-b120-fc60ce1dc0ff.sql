
CREATE TABLE IF NOT EXISTS public.app_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  login_background_url TEXT,
  favicon_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_singleton CHECK (id = true)
);

INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app settings"
  ON public.app_settings FOR SELECT USING (true);

CREATE POLICY "Admins can update app settings"
  ON public.app_settings FOR UPDATE TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can insert app settings"
  ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

INSERT INTO storage.buckets (id, name, public)
VALUES ('app-assets', 'app-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read app-assets"
  ON storage.objects FOR SELECT USING (bucket_id = 'app-assets');

CREATE POLICY "Admins upload app-assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'app-assets' AND public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins update app-assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'app-assets' AND public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins delete app-assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'app-assets' AND public.get_user_role(auth.uid()) = 'admin');
