-- Migration: Setup storage buckets for community posts and media
-- This creates storage buckets and RLS policies for image/gif uploads

-- ============================================================================
-- Create storage buckets (using storage.buckets table)
-- ============================================================================

-- Check if bucket exists and create if not
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-posts',
  'community-posts',
  true,
  52428800, -- 50MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Create RLS policies for community-posts bucket
-- ============================================================================

-- Policy 1: Allow public read access to all files
CREATE POLICY "Public read access for community-posts"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'community-posts');

-- Policy 2: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload to community-posts"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    bucket_id = 'community-posts'
  );

-- Policy 3: Allow users to delete their own uploads
CREATE POLICY "Users can delete their own community-posts uploads"
  ON storage.objects
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    bucket_id = 'community-posts' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- ============================================================================
-- Create post-gifs bucket for GIF uploads
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-gifs',
  'post-gifs',
  true,
  52428800, -- 50MB limit per file
  ARRAY['image/gif', 'video/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- Policy 1: Allow public read access to GIFs
CREATE POLICY "Public read access for post-gifs"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'post-gifs');

-- Policy 2: Allow authenticated users to upload GIFs
CREATE POLICY "Authenticated users can upload to post-gifs"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    bucket_id = 'post-gifs'
  );

-- Policy 3: Allow users to delete their own GIF uploads
CREATE POLICY "Users can delete their own post-gifs uploads"
  ON storage.objects
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    bucket_id = 'post-gifs' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

