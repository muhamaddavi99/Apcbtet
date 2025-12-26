-- Update RLS policy for announcements to allow staff to manage
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;

CREATE POLICY "Admins and staff can manage announcements"
ON public.announcements
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'staff')
  )
);