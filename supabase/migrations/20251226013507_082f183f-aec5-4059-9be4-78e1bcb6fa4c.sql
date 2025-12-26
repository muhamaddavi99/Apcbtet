-- Add image_url column to announcements for image attachments
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS image_url text;

-- Add uptime_started_at column to store system start time (for uptime calculation)
-- We'll use a separate table for this
CREATE TABLE IF NOT EXISTS public.system_info (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_info ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view system info
CREATE POLICY "Anyone can view system info" 
ON public.system_info 
FOR SELECT 
USING (true);

-- Only admins can manage system info
CREATE POLICY "Admins can manage system info" 
ON public.system_info 
FOR ALL 
USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Insert initial record if not exists
INSERT INTO public.system_info (started_at) 
SELECT now() 
WHERE NOT EXISTS (SELECT 1 FROM public.system_info LIMIT 1);