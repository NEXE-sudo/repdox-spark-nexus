-- Normalize existing events.image_url values to store only the storage object path
-- This converts values that are full URLs (public URLs or previously stored signed URLs)
-- into the storage path format 'events/<filename>' where possible. Review before running.

BEGIN;

-- Example strategy: if image_url contains '/storage/v1/object/public/events/', extract the suffix
UPDATE public.events
SET image_url = regexp_replace(image_url, '^.*?/storage/v1/object/public/events/', 'events/')
WHERE image_url IS NOT NULL
  AND image_url LIKE '%/storage/v1/object/public/events/%';

-- If image_url contains the bucket prefix 'events/' already, no-op; keep those rows.

-- If image_url contains a signed URL with 'events/' anywhere, attempt to extract the path
UPDATE public.events
SET image_url = substring(image_url FROM 'events/[^\?\n\r]+')
WHERE image_url IS NOT NULL
  AND image_url ~ 'events/[^\?\n\r]+';

COMMIT;
