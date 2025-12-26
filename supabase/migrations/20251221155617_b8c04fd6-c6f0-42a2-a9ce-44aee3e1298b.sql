-- Create table to track teachers who didn't teach
CREATE TABLE public.teacher_no_teach_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  reason TEXT DEFAULT 'Tidak memulai sesi mengajar',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, schedule_id, date)
);

-- Enable RLS
ALTER TABLE public.teacher_no_teach_records ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Staff and admins can view no teach records" 
ON public.teacher_no_teach_records 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'staff')
));

CREATE POLICY "Staff and admins can manage no teach records" 
ON public.teacher_no_teach_records 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'staff')
));

CREATE POLICY "Teachers can view own no teach records" 
ON public.teacher_no_teach_records 
FOR SELECT 
USING (auth.uid() = teacher_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_no_teach_records;