-- Create teacher_leave_requests table for permission/sick leave requests
CREATE TABLE public.teacher_leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('izin', 'sakit')),
  reason TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teacher_leave_requests ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own requests
CREATE POLICY "Teachers can view own leave requests"
ON public.teacher_leave_requests
FOR SELECT
USING (auth.uid() = teacher_id);

-- Teachers can insert their own requests
CREATE POLICY "Teachers can insert own leave requests"
ON public.teacher_leave_requests
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

-- Staff and admins can view all requests
CREATE POLICY "Staff and admins can view all leave requests"
ON public.teacher_leave_requests
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('admin', 'staff')
));

-- Staff and admins can update all requests
CREATE POLICY "Staff and admins can update leave requests"
ON public.teacher_leave_requests
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('admin', 'staff')
));

-- Create trigger for updated_at
CREATE TRIGGER update_teacher_leave_requests_updated_at
BEFORE UPDATE ON public.teacher_leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();