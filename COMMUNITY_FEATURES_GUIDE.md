# Community Feature Implementation Guide

## Overview
This guide covers the implementation of enhanced community features including:
1. ✅ Interactive posts with likes, comments, and shares
2. ✅ Post composition with images, GIFs, location, polls, and scheduling
3. ✅ Real-time hashtag suggestions (autocomplete)
4. ✅ 48-hour trending hashtags system
5. ✅ User profiles are clickable (navigate to profiles)

## Features Implemented

### 1. Interactive Posts
- **Like/Unlike**: Click heart button to like/unlike posts. Uses `posts_likes` table to track user engagement
- **Comments**: Click comment button to navigate to post detail page
- **Share**: Share functionality available for future implementation
- **Post Images**: Up to 4 images can be attached per post and displayed in a grid
- **Post GIF**: Single GIF support for animated content
- **Location Tagging**: Share location data with posts using browser geolocation API
- **Poll Feature**: Create multi-option polls with posts
- **Scheduled Posts**: Schedule posts to be published at a specific time

### 2. Real-Time Hashtag Suggestions
- **Autocomplete**: As user types `#` followed by characters, suggestions appear
- **Trending-Based**: Suggestions pulled from actual 48-hour trending hashtags
- **Sorted by Popularity**: Most popular hashtags appear first
- **Click-to-Insert**: Click a suggestion to insert it into post text
- **Dynamic Filtering**: Suggestions filter as you type more characters

### 3. Enhanced Trending System
- **48-Hour Window**: Only includes hashtags from posts created in the last 48 hours
- **Accurate Counts**: Counts how many posts use each hashtag
- **Top 15 Display**: Shows top 15 trending hashtags (configurable)
- **Auto-Refresh**: Refreshes every 30 seconds for real-time updates
- **Fallback Logic**: Falls back to feed posts if database query fails

### 4. Post Composition Features

#### Image Upload
- **Storage**: Uses Supabase Storage (`community-posts` bucket)
- **Multi-Upload**: Support for up to 4 images per post
- **Preview**: Images shown before posting with remove buttons
- **Error Handling**: Graceful error messages if upload fails

#### GIF Integration
- **Button Ready**: GIF button included in UI
- **Giphy Integration**: To enable, add Giphy API:
  ```bash
  npm install @giphy/js-fetch-api @giphy/react-components
  ```
- **Implementation**: Will need Giphy API key from https://developers.giphy.com/

#### Location Sharing
- **Geolocation API**: Uses browser's native geolocation
- **Privacy**: User must grant permission
- **Display**: Shows coordinates and optional address
- **Future Enhancement**: Add geocoding (Google Maps API) to convert coordinates to addresses

#### Poll Creation
- **Multi-Option**: Create polls with multiple answer options
- **Add Options**: Click "Add Option" to add more choices
- **Voting**: Poll votes tracked in `poll_votes` table
- **Results**: Vote counts stored per option

#### Post Scheduling
- **Future Publishing**: Schedule posts for later
- **DateTime Picker**: Use HTML5 datetime-local input
- **Scheduled Status**: Posts marked as `is_scheduled=true`
- **Auto-Publish**: Scheduled posts publish automatically (future feature)

### 5. Post Interactions
- **Like Counter**: Real-time like count updates
- **Comment Counter**: Shows number of comments
- **Share Button**: Ready for share functionality
- **User Navigation**: Click profile avatar or name to visit user profile

## Database Schema

### New Tables Created

#### posts_likes
```sql
id (UUID) - Primary key
post_id (UUID) - References community_posts
user_id (UUID) - References auth.users
created_at (TIMESTAMP) - When like was created
UNIQUE(post_id, user_id) - Prevent duplicate likes
```

#### posts_comments
```sql
id (UUID) - Primary key
post_id (UUID) - References community_posts
user_id (UUID) - References auth.users
content (TEXT) - Comment content
created_at (TIMESTAMP) - When created
updated_at (TIMESTAMP) - Last update time
```

#### polls
```sql
id (UUID) - Primary key
post_id (UUID) - References community_posts
question (TEXT) - Poll question
options (TEXT[]) - Array of poll options
created_at (TIMESTAMP) - When created
```

#### poll_votes
```sql
id (UUID) - Primary key
poll_id (UUID) - References polls
user_id (UUID) - References auth.users
option_index (INT) - Index of selected option
created_at (TIMESTAMP) - When voted
UNIQUE(poll_id, user_id) - Prevent duplicate votes
```

### Extended Columns on community_posts
```sql
images_urls (TEXT[]) - Array of image URLs
gif_url (TEXT) - Single GIF URL
location (JSONB) - {latitude, longitude, address}
poll_id (UUID) - References polls table
scheduled_at (TIMESTAMP) - When post should be published
is_scheduled (BOOLEAN) - Whether post is scheduled
```

## Setup Instructions

### Step 1: Apply Database Migrations
```bash
# 1. Go to Supabase Dashboard
# 2. Navigate to SQL Editor
# 3. Copy and execute content of:
#    supabase/migrations/20251114_extend_community_posts_features.sql

# OR use Supabase CLI:
supabase db push
```

### Step 2: Set Up Storage Bucket
```bash
# 1. Go to Supabase Dashboard
# 2. Navigate to Storage
# 3. Create new bucket named "community-posts"
# 4. Update bucket policies for RLS:
#    - Allow authenticated users to upload
#    - Allow public read access
```

### Step 3: (Optional) Add Giphy Integration
```bash
# Install Giphy libraries
npm install @giphy/js-fetch-api @giphy/react-components

# Add to your .env.local:
VITE_GIPHY_API_KEY=your_giphy_api_key_here

# Get API key from: https://developers.giphy.com/dashboard
```

### Step 4: (Optional) Add Google Maps for Address Geocoding
```bash
# Install Google Maps library
npm install @react-google-maps/api

# Add to your .env.local:
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Get API key from: https://cloud.google.com/maps-platform
```

### Step 5: (Optional) Add Emoji Picker
```bash
# Install emoji picker
npm install emoji-picker-react

# Import and use in post composition UI
```

## State Management

### Post Composition State
```typescript
newPost: string                          // Post content
selectedImages: string[]                 // Array of image URLs
selectedGif: string | null               // Single GIF URL
userLocation: {                          // Location data
  latitude: number;
  longitude: number;
  address?: string;
}
pollOptions: string[]                    // Array of poll options
showPollCreator: boolean                 // Show/hide poll UI
scheduledTime: string                    // ISO datetime string
showHashtagSuggestions: boolean          // Show/hide suggestions
hashtagSuggestions: Array<{              // Trending hashtags
  hashtag: string;
  count: number;
}>
```

### Interaction State
```typescript
likedPosts: string[]                     // Array of post IDs user has liked
friends: Friendship[]                    // User's friends
blockedUsers: string[]                   // Blocked user IDs
```

### Trending State
```typescript
trendingHashtags: Array<{                // Top trending hashtags
  hashtag: string;
  count: number;
  category?: string;
}>
isLoadingTrending: boolean               // Loading state
```

## Key Functions

### loadTrendingHashtags()
- **Purpose**: Fetch hashtags from last 48 hours and rank by popularity
- **Trigger**: On mount + every 30 seconds auto-refresh
- **Logic**:
  1. Query `community_posts` from last 48 hours
  2. Extract hashtags using regex `/#\w+/g`
  3. Count frequency of each hashtag
  4. Sort by frequency (descending)
  5. Return top 15

### updateHashtagSuggestions(text)
- **Purpose**: Filter trending hashtags based on user input
- **Trigger**: On textarea change
- **Logic**:
  1. Find last `#` in text
  2. Get characters after `#`
  3. Filter trending hashtags by match
  4. Sort by popularity
  5. Show dropdown with suggestions

### handleCreatePost()
- **Purpose**: Create post with all features
- **Features**:
  1. Insert into `community_posts` table
  2. Create poll if options provided
  3. Update trending hashtags
  4. Reset composition state
  5. Show success message

### handleLikePost(postId)
- **Purpose**: Like/unlike a post
- **Logic**:
  1. Check if already liked
  2. Insert/delete from `posts_likes`
  3. Update local state
  4. Update like count on post

### handleImageUpload(files)
- **Purpose**: Upload images to Supabase Storage
- **Logic**:
  1. Loop through selected files
  2. Upload to `community-posts` bucket
  3. Get public URLs
  4. Add to `selectedImages` state
  5. Show preview with remove buttons

### handleGetLocation()
- **Purpose**: Get user's current location
- **Uses**: Browser Geolocation API
- **Returns**: Latitude, longitude, and optional address

## Testing Guide

### Test Like/Unlike
1. Open Community page
2. Hover over a post
3. Click heart button
4. Verify count increases
5. Click again to unlike
6. Verify count decreases

### Test Hashtag Suggestions
1. Click in post composition box
2. Type `#te`
3. Verify suggestions dropdown appears
4. Click a suggestion
5. Verify hashtag is inserted into text

### Test Image Upload
1. Click image icon in post composition
2. Select 1-4 images
3. Verify preview shows in post area
4. Click X to remove images
5. Verify images are removed
6. Click Post to create post with images
7. Verify images appear in feed

### Test Location
1. Click location icon
2. Grant browser geolocation permission
3. Verify location info appears below post box
4. Click X to remove
5. Create post with location
6. Verify location shows in feed post

### Test Poll Creation
1. Click poll icon to toggle poll creator
2. Enter poll question and options
3. Click "Add Option" to add more
4. Create post
5. Verify poll displays with options in feed

### Test Post Scheduling
1. Click schedule icon
2. Pick a time in the future
3. Verify time displays below post box
4. Create post
5. Verify post shows scheduled indicator

## Performance Considerations

### Hashtag Loading
- **Current**: Top 15 hashtags from 48-hour window
- **Optimization**: Consider caching with longer intervals if data grows

### Image Upload
- **Current**: 4 images max per post
- **Optimization**: Implement image compression/resizing

### Trending Refresh
- **Current**: Every 30 seconds
- **Optimization**: Consider longer intervals (60-120s) if high load

## Future Enhancements

1. **Comments Page**: Create detail page for individual posts
2. **Comment Threading**: Replies to comments
3. **Giphy Integration**: Full GIF search from Giphy
4. **Google Maps Geocoding**: Convert coordinates to addresses
5. **Emoji Picker**: Full emoji support in posts
6. **Post Editing**: Edit posts after creation
7. **Poll Results**: Show poll results during voting
8. **Hashtag Pages**: Click hashtag to see all posts with that tag
9. **Post Search**: Search by content, hashtag, user
10. **Draft Posts**: Save drafts before publishing
11. **Rich Text Editor**: Bold, italic, links, etc.
12. **Markdown Support**: Format posts with markdown
13. **Auto-Save**: Save drafts while typing
14. **Media Compression**: Compress images before upload
15. **CDN Integration**: Use CDN for image delivery

## Troubleshooting

### Posts Not Loading
- Check browser console for errors
- Verify Supabase connection
- Check RLS policies are correct
- Verify `community_posts` table exists

### Images Not Uploading
- Check `community-posts` bucket exists
- Verify storage bucket RLS policies
- Check file size limits
- Verify image format is supported

### Hashtag Suggestions Not Showing
- Verify trending hashtags are being loaded
- Check if posts have hashtags in content
- Check console for regex errors
- Verify `trendingHashtags` state updates

### Likes Not Persisting
- Check `posts_likes` table exists
- Verify RLS policies allow inserts
- Check user is authenticated
- Verify post ID is valid

### Location Permission Denied
- Check browser geolocation is enabled
- Verify user grants permission
- Check if running on HTTPS (required for geolocation)

## API Keys Needed (Optional Features)

| Feature | Service | Setup URL |
|---------|---------|-----------|
| GIF Search | Giphy | https://developers.giphy.com/dashboard |
| Address Geocoding | Google Maps | https://cloud.google.com/maps-platform |
| Alternative Images | Cloudinary | https://cloudinary.com/console |
| Analytics | Segment | https://segment.com/ |

## File Locations

- **Main Component**: `src/pages/Community.tsx` (1000+ lines)
- **Database Migrations**: `supabase/migrations/20251114_extend_community_posts_features.sql`
- **Type Definitions**: Within `Community.tsx` (UserProfile, FeedPost, Friendship, Poll, PollVote interfaces)

