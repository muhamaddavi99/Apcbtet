-- Create school_settings table to store school time settings
CREATE TABLE public.school_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name text NOT NULL DEFAULT 'MA Al-Ittifaqiah 2',
  school_address text,
  school_phone text,
  school_icon_url text,
  check_in_time time NOT NULL DEFAULT '07:00:00',
  late_time time NOT NULL DEFAULT '07:30:00',
  check_out_time time NOT NULL DEFAULT '14:00:00',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view settings
CREATE POLICY "Anyone can view school settings"
ON public.school_settings
FOR SELECT
USING (true);

-- Only admins can manage settings
CREATE POLICY "Admins can manage school settings"
ON public.school_settings
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

-- Insert default settings
INSERT INTO public.school_settings (school_name, check_in_time, late_time, check_out_time)
VALUES ('MA Al-Ittifaqiah 2', '07:00:00', '07:30:00', '14:00:00');

-- Enable pg_cron and pg_net for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;