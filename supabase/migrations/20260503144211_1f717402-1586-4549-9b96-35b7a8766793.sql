CREATE TABLE public.sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read sections" ON public.sections FOR SELECT USING (true);
CREATE POLICY "Public insert sections" ON public.sections FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update sections" ON public.sections FOR UPDATE USING (true);
CREATE POLICY "Public delete sections" ON public.sections FOR DELETE USING (true);

CREATE INDEX idx_sections_class_id ON public.sections(class_id);