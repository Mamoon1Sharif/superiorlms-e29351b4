
-- Add question_type column (mcq, true_false, fill_blank) defaulting to mcq
ALTER TABLE public.quiz_questions
ADD COLUMN question_type text NOT NULL DEFAULT 'mcq';

-- Add correct_answer_text for fill_blank questions
ALTER TABLE public.quiz_questions
ADD COLUMN correct_answer_text text DEFAULT '';
