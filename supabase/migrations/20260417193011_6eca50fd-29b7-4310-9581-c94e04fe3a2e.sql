
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS cover_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('course-covers', 'course-covers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read course covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-covers');

CREATE POLICY "Public insert course covers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'course-covers');

CREATE POLICY "Public update course covers"
ON storage.objects FOR UPDATE
USING (bucket_id = 'course-covers');

CREATE POLICY "Public delete course covers"
ON storage.objects FOR DELETE
USING (bucket_id = 'course-covers');
