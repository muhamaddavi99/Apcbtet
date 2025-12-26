-- Create teaching_sessions table for realtime countdown
CREATE TABLE public.teaching_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teaching_sessions ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own sessions
CREATE POLICY "Teachers can manage own sessions"
ON public.teaching_sessions
FOR ALL
USING (auth.uid() = teacher_id);

-- Staff and admins can view all sessions
CREATE POLICY "Staff and admins can view all sessions"
ON public.teaching_sessions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'staff')
    )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.teaching_sessions;