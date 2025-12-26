-- Create storage bucket for APK files
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-releases', 'app-releases', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for app releases bucket
CREATE POLICY "Anyone can view app releases"
ON storage.objects FOR SELECT
USING (bucket_id = 'app-releases');

CREATE POLICY "Admins can upload app releases"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'app-releases' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update app releases"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'app-releases' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete app releases"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'app-releases' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);