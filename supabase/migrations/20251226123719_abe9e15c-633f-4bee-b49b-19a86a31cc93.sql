-- Create app_versions table for version management
CREATE TABLE public.app_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version_code integer NOT NULL,
  version_name text NOT NULL,
  release_notes text,
  download_url text,
  is_force_update boolean DEFAULT false,
  is_active boolean DEFAULT true,
  platform text DEFAULT 'all',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- Anyone can view app versions
CREATE POLICY "Anyone can view app versions" 
ON public.app_versions 
FOR SELECT 
USING (true);

-- Only admins can manage app versions
CREATE POLICY "Admins can manage app versions" 
ON public.app_versions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

-- Create trigger for updated_at
CREATE TRIGGER update_app_versions_updated_at
BEFORE UPDATE ON public.app_versions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert initial version
INSERT INTO public.app_versions (version_code, version_name, release_notes, is_active, platform)
VALUES (1, '1.0.0', 'Versi awal aplikasi', true, 'all');