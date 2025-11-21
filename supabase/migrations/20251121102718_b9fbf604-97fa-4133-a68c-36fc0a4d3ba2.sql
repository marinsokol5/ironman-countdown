-- Create storage bucket for workout images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workout-images',
  'workout-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
);

-- RLS policies for workout images bucket
-- Allow authenticated users to upload their own images
CREATE POLICY "Users can upload workout images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workout-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view their own images
CREATE POLICY "Users can view their workout images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'workout-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own images
CREATE POLICY "Users can delete their workout images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'workout-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access (since bucket is public)
CREATE POLICY "Public read access to workout images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'workout-images');