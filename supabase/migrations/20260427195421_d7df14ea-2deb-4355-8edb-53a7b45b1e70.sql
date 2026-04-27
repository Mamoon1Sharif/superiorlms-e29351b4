-- Allow campus admins to approve/reject students in their campus
CREATE POLICY "Campus admins can update their campus students"
ON public.students
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.campus_admins ca
    WHERE ca.user_id = auth.uid() AND ca.campus_id = students.campus_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campus_admins ca
    WHERE ca.user_id = auth.uid() AND ca.campus_id = students.campus_id
  )
);