# Media, Location & Advanced Features Setup Guide

## Overview

This document details what's currently available in your Supabase database and codebase to handle extra features like photos, GIFs, location data, and more. It also identifies what else you might need to implement.

---

## 1. Current Database Schema & Capabilities

### ✅ Already Implemented

#### **A. Photos/Images Support**

- **Field**: `images_urls` (TEXT[] - array of strings)
- **Location**: `community_posts` table
- **Storage**: Supports multiple image URLs
- **Default**: Empty array `{}`
- **UI Support**:
  - Drag-and-drop or file upload in Community component
  - Grid display with up to 4 images in posts and comments
  - Click-to-open image preview (can be enhanced with lightbox)

#### **B. GIF Support**

- **Field**: `gif_url` (TEXT)
- **Location**: `community_posts` table
- **Storage**: Single GIF URL
- **Current Status**: UI button exists but Giphy integration not fully implemented
- **Next Steps**: Need to add Giphy API integration

#### **C. Location Support**

- **Field**: `location` (JSONB)
- **Location**: `community_posts` table
- **Storage Format**:
  ```json
  {
    "latitude": number,
    "longitude": number,
    "address": string (optional)
  }
  ```
- **UI Support**:
  - Geolocation button to get user's current location
  - Displays `location.address` if available, otherwise shows coordinates
  - MapPin icon next to location display

#### **D. Polls Support**

- **Tables**:
  - `polls` (question, options[], created_at, expires_at)
  - `poll_votes` (tracks user votes with UNIQUE constraint)
- **Features**:
  - Multiple choice questions (up to 5 options)
  - Drag-to-rearrange options
  - Delete options functionality
  - Poll duration (days, hours, minutes)
  - Poll expiry time tracking
- **UI Support**: Fully implemented with vote counting

#### **E. Scheduled Posts**

- **Fields**:
  - `scheduled_at` (TIMESTAMP WITH TIME ZONE)
  - `is_scheduled` (BOOLEAN)
- **Location**: `community_posts` table
- **UI Support**: Schedule button with time picker
- **Note**: Posts only display if `is_scheduled = false` OR `scheduled_at <= now()`

#### **F. Comments with Likes**

- **Table**: `posts_comments`
- **Fields**:
  - `id` (UUID)
  - `post_id` (FK to community_posts)
  - `user_id` (FK to auth.users)
  - `content` (TEXT)
  - `likes_count` (INT)
  - `created_at`, `updated_at` (TIMESTAMPS)
- **Like Tracking**: `user_comment_likes` table (similar to `user_post_likes`)

#### **G. User Profile Integration**

- **Table**: `user_profiles`
- **Key Fields**:
  - `handle` (VARCHAR) - User-defined unique handle for @mentions
  - `location` (TEXT) - User's real location (distinct from post location)
  - `avatar_url` (TEXT)
  - `full_name`, `bio`, `job_title`, `company`
- **Current Usage**: Properly loaded in posts and comments with handle-based mentions

---

## 2. What Still Needs to be Added

### ⚠️ Not Yet Implemented (But Recommended)

#### **A. Hashtag Support**

**Database Changes Needed:**

```sql
-- Create hashtags tracking table
CREATE TABLE IF NOT EXISTS hashtags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  hashtag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hashtags_post_id ON hashtags(post_id);
CREATE INDEX idx_hashtags_hashtag ON hashtags(hashtag);

-- Enable RLS
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hashtags are viewable by everyone" ON hashtags
  FOR SELECT USING (true);

CREATE POLICY "Users can add hashtags" ON hashtags
  FOR INSERT WITH CHECK (true);
```

**Frontend Implementation:**

- Parse hashtags from post content using regex: `#[\w]+`
- Make them clickable and navigable to hashtag feed
- Show trending hashtags on sidebar

---

#### **B. Enhanced Location Support (Address Lookup)**

**Recommended Packages:**

```bash
npm install geolocation-db
# OR use Google Maps API for reverse geocoding
```

**Database Enhancement:**

```sql
-- Add location metadata columns
ALTER TABLE community_posts
ADD COLUMN IF NOT EXISTS location_city TEXT,
ADD COLUMN IF NOT EXISTS location_country TEXT,
ADD COLUMN IF NOT EXISTS location_name TEXT;

-- Create index for location-based queries
CREATE INDEX idx_posts_location_city ON community_posts(location_city);
```

**Implementation:**

- Use Google Maps Geocoding API or Open Street Map for reverse geocoding
- Store human-readable address: "San Francisco, California, USA"
- Show location suggestions when user types

---

#### **C. Giphy Integration for GIF Support**

**Setup Steps:**

1. Get API key from: https://developers.giphy.com/
2. Install package: `npm install axios`
3. Create API endpoint in Supabase edge function

**Frontend Implementation:**

```typescript
const searchGifs = async (query: string) => {
  const response = await fetch(
    `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${query}&limit=10`
  );
  const data = await response.json();
  return data.data; // Array of GIF objects
};
```

---

#### **D. Video Support**

**Database Changes:**

```sql
ALTER TABLE community_posts
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS video_thumbnail_url TEXT;
```

**Implementation:**

- Support MP4, WebM, OGG formats
- Use Supabase Storage for video hosting
- Store video URLs similar to images
- Use HTML5 `<video>` element with controls

---

#### **E. Rich Text / Markdown Support**

**Recommended Package:**

```bash
npm install react-markdown remark-gfm
```

**Database Enhancement:**

```sql
-- Add content_type column to community_posts
ALTER TABLE community_posts
ADD COLUMN IF NOT EXISTS content_type VARCHAR DEFAULT 'plain_text';
-- Values: 'plain_text', 'markdown', 'html'
```

---

#### **F. File Attachments (Documents, PDFs, etc.)**

**Database Changes:**

```sql
CREATE TABLE IF NOT EXISTS post_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INT,
  file_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_attachments_post_id ON post_attachments(post_id);

ALTER TABLE post_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attachments are viewable by everyone" ON post_attachments
  FOR SELECT USING (true);

CREATE POLICY "Users can add attachments" ON post_attachments
  FOR INSERT WITH CHECK (true);
```

---

#### **G. @ Mention / Tag System Enhancement**

**Current Status**: Already implemented with `handle` field
**Database:** `user_profiles.handle` field is used
**Enhancement Recommendations:**

```sql
-- Create mentions tracking table for analytics
CREATE TABLE IF NOT EXISTS mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentioning_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mentions_mentioned ON mentions(mentioned_user_id);
CREATE INDEX idx_mentions_post ON mentions(post_id);
```

---

#### **H. Repost / Share Feature**

**Database Changes:**

```sql
CREATE TABLE IF NOT EXISTS reposts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  repost_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(original_post_id, repost_by_user_id)
);

CREATE INDEX idx_reposts_original ON reposts(original_post_id);
CREATE INDEX idx_reposts_user ON reposts(repost_by_user_id);
```

---

#### **I. Pin / Bookmark Feature**

**Database Changes:**

```sql
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, user_id)
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_post ON bookmarks(post_id);
```

---

#### **J. Search & Full Text Search**

**Database Enhancement:**

```sql
-- Add search index
CREATE INDEX idx_posts_content_search ON community_posts
USING GIN(to_tsvector('english', content));

-- Create search function
CREATE OR REPLACE FUNCTION search_posts(search_query TEXT)
RETURNS TABLE(id UUID, content TEXT, user_id UUID, created_at TIMESTAMP WITH TIME ZONE) AS $$
  SELECT id, content, user_id, created_at
  FROM community_posts
  WHERE to_tsvector('english', content) @@ plainto_tsquery('english', search_query)
  ORDER BY created_at DESC;
$$ LANGUAGE SQL STABLE;
```

---

## 3. Implementation Priority

### Phase 1 (Already Done ✅)

- Images/Photos
- Location (coordinates)
- Polls
- Comments with likes
- Scheduled posts
- Handle-based mentions

### Phase 2 (Recommended Next)

1. **Giphy Integration** - Quick addition to existing `gif_url` field
2. **Hashtag Support** - Essential for discoverability
3. **Address Lookup** - Better UX for location selection
4. **Video Support** - Natural extension of image support

### Phase 3 (Enhancement)

5. **Rich Text/Markdown** - Better content formatting
6. **File Attachments** - Document sharing
7. **Mention Analytics** - Understand engagement
8. **Repost/Share** - Content amplification

### Phase 4 (Polish)

9. **Bookmarks** - User content curation
10. **Full Text Search** - Content discovery
11. **Trending Hashtags** - Social features

---

## 4. Storage Considerations

### Supabase Storage Setup

Currently using Supabase Storage for images. Ensure bucket exists:

```typescript
// Create storage bucket (run once in Supabase console)
const { data, error } = await supabase.storage.createBucket("post-media", {
  public: true,
  allowedMimeTypes: ["image/*", "video/*", "application/pdf"],
  fileSizeLimit: 52428800, // 50MB
});
```

### RLS Policies for Storage

```sql
-- Allow public read access to post media
CREATE POLICY "Public Access"
  on storage.objects for select
  using ( bucket_id = 'post-media' );

-- Allow authenticated users to upload
CREATE POLICY "Authenticated uploads"
  on storage.objects for insert
  with check (
    auth.role() = 'authenticated' AND
    bucket_id = 'post-media'
  );

-- Allow users to delete their own uploads
CREATE POLICY "User delete"
  on storage.objects for delete
  using (
    auth.role() = 'authenticated' AND
    bucket_id = 'post-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## 5. API Integration Checklist

- [ ] Giphy API key in `.env.local`
- [ ] Google Maps API key for address lookup (optional)
- [ ] Supabase Storage buckets configured
- [ ] RLS policies for storage set up
- [ ] Database migrations deployed with `supabase db push`
- [ ] Edge functions for video processing (optional)

---

## 6. Testing Checklist

```typescript
// Test image upload
POST /community_posts with images_urls: ["https://..."]

// Test location tagging
POST /community_posts with location: {
  latitude: 37.7749,
  longitude: -122.4194,
  address: "San Francisco, CA"
}

// Test poll creation
POST /polls with question, options, expires_at

// Test GIF selection
POST /community_posts with gif_url: "https://..."

// Test comment likes
POST /user_comment_likes with comment_id, user_id

// Test scheduled posts
POST /community_posts with is_scheduled: true, scheduled_at: "2025-12-25T10:00:00Z"
```

---

## Summary

Your current codebase has **solid foundations** for:

- ✅ Media (images, GIFs)
- ✅ Location tagging
- ✅ Polls with voting
- ✅ Comments with likes
- ✅ Scheduled posts
- ✅ Handle-based mentions

**Most impactful additions:**

1. Giphy integration (quick win)
2. Hashtag system (engagement)
3. Address lookup (UX improvement)
4. Video support (feature parity)

All require minimal database changes and straightforward frontend implementation.
