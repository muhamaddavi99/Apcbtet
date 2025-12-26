-- Add storage policies for authenticated users to upload to avatars bucket
-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Authenticated users can upload to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own uploads" ON storage.objects;

-- Allow authenticated users to upload files to avatars bucket
CREATE POLICY "Authenticated users can upload to avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow anyone to view files in avatars bucket (it's public)
CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update own uploads"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete own uploads"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');