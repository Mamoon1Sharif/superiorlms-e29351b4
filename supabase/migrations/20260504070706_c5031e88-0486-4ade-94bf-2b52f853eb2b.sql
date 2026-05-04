
-- Add thumbnail to lessons (videos)
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add pdf to assignment_details, drop deadline usage (keep column nullable for backward compat)
ALTER TABLE public.assignment_details ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Create storage buckets (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('video-thumbnails', 'video-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('assignment-pdfs', 'assignment-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Public read policies
DO $$ BEGIN
  CREATE POLICY "Video thumbnails are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'video-thumbnails');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can upload video thumbnails"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'video-thumbnails');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can update video thumbnails"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'video-thumbnails');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can delete video thumbnails"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'video-thumbnails');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Assignment PDFs are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'assignment-pdfs');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can upload assignment pdfs"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'assignment-pdfs');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can update assignment pdfs"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'assignment-pdfs');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can delete assignment pdfs"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'assignment-pdfs');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
