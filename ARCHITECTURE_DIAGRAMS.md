# Community Features Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      COMMUNITY PAGE (/community)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  │   LEFT SIDEBAR   │  │   CENTER FEED    │  │   RIGHT SIDEBAR  │
│  │   (Navigation)   │  │  (Posts + Compose)  │  │   (Search +      │
│  │                  │  │                  │  │    Trending)     │
│  │ • Home           │  │  Post Composition│  │                  │
│  │ • Explore        │  │  ┌──────────────┐│  │ Search Bar       │
│  │ • Messages       │  │  │ Text Editor  ││  │                  │
│  │ • Communities    │  │  │ with #        ││  │ What's Happening │
│  │                  │  │  │ suggestions  ││  │ ┌──────────────┐ │
│  │                  │  │  └──────────────┘│  │ │ #hashtag     │ │
│  │                  │  │  Action Buttons: │  │ │ 125 posts    │ │
│  │                  │  │  📷 🎬 📍 📊 🕒 😊 │  │ └──────────────┘ │
│  │                  │  │                  │  │ ┌──────────────┐ │
│  │                  │  │  Posts Feed:     │  │ │ #trending    │ │
│  │                  │  │  ┌──────────────┐│  │ │ 89 posts     │ │
│  │                  │  │  │ Post 1       ││  │ └──────────────┘ │
│  │                  │  │  │ [Image Grid] ││  │  (Auto-updates   │
│  │                  │  │  │ [Poll]       ││  │   every 30s)     │
│  │                  │  │  │ ❤️ 💬 🔄     ││  │                  │
│  │                  │  │  └──────────────┘│  │                  │
│  │                  │  │  ┌──────────────┐│  │                  │
│  │                  │  │  │ Post 2       ││  │ Recent Users     │
│  │                  │  │  │ [Images + GIF]││  │ (User Search)    │
│  │                  │  │  │ 📍 Location  ││  │                  │
│  │                  │  │  │ ❤️ 💬 🔄     ││  │                  │
│  │                  │  │  └──────────────┘│  │                  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ▼
                   ┌──────────────────────┐
                   │  SUPABASE BACKEND    │
                   ├──────────────────────┤
                   │  PostgreSQL Database │
                   │  + Storage Buckets   │
                   └──────────────────────┘
```

## Data Flow Diagram

```
USER ACTIONS                 FRONTEND LOGIC              DATABASE
    │                             │                        │
    ├─► Type in post ─────────────► updateHashtagSuggestions() 
    │                              │                        │
    │                              ├─► [Filter trending]    │
    │                              │                        │
    │                              └─► Show dropdown ◄──────┤
    │                                                       ├─ Query last 48h
    │                                                       │  posts
    │                                                       │
    ├─► Click heart icon ──────────► handleLikePost()      │
    │                              │                        │
    │                              ├─► [Insert/Delete] ────►│
    │                              │                        │ posts_likes
    │                              ├─► [Update state]       │  table
    │                              │                        │
    │                              └─► Update like count ◄──┤
    │                                                        │
    ├─► Click image button ────────► handleImageUpload()    │
    │                              │                        │
    │                              ├─► [Upload to Storage]──►│
    │                              │                        │ community-posts
    │                              ├─► [Show preview]       │  bucket
    │                              │                        │
    │                              └─► Add to selectedImages │
    │                                                        │
    ├─► Click location ────────────► handleGetLocation()    │
    │                              │                        │
    │                              ├─► [Browser API]        │
    │                              │                        │
    │                              └─► Set userLocation     │
    │                                                        │
    ├─► Create poll ───────────────► handleCreatePost()     │
    │                              │                        │
    │                              ├─► [Insert post] ──────►│
    │                              │                        │ community_posts
    │                              ├─► [Insert poll] ──────►│
    │                              │                        │ polls
    │                              └─► [Reset state]        │
    │                                                        │
    ├─► Refresh page ──────────────► useEffect on mount     │
    │                              │                        │
    │                              ├─► loadFeedPosts() ────►│
    │                              │                        │ Fetch posts
    │                              ├─► loadTrendingHashtags()│
    │                              │                        │ 48h window
    │                              ├─► loadUserLikes() ────►│
    │                              │                        │ Get liked posts
    │                              │                        │
    │                              └─► [Update all state]   │
    │                                                        │
    └─► [Auto every 30s] ─────────► loadTrendingHashtags()  │
                                   │                        │
                                   └─► [Recalculate trends] │
```

## State Management Structure

```
Community.tsx Component
│
├─ Authentication
│  ├─ user: User | null
│  └─ navigate: useNavigate()
│
├─ Post Composition
│  ├─ newPost: string
│  ├─ selectedImages: string[]
│  ├─ selectedGif: string | null
│  ├─ userLocation: {latitude, longitude, address}
│  ├─ pollOptions: string[]
│  ├─ showPollCreator: boolean
│  ├─ scheduledTime: string
│  ├─ fileInputRef: RefObject
│  ├─ showHashtagSuggestions: boolean
│  └─ hashtagSuggestions: Array<{hashtag, count}>
│
├─ Feed Data
│  ├─ feedPosts: FeedPost[]
│  ├─ likedPosts: string[]
│  └─ activeTab: "feed" | "people" | "friends"
│
├─ Search
│  ├─ searchQuery: string
│  ├─ searchResults: UserProfile[]
│  └─ isSearching: boolean
│
├─ Social
│  ├─ friends: Friendship[]
│  └─ blockedUsers: string[]
│
├─ Trending
│  ├─ trendingHashtags: Array<{hashtag, count, category}>
│  └─ isLoadingTrending: boolean
│
└─ UI State
   ├─ isLoading: boolean
   ├─ error: string | null
   └─ success: string | null
```

## Database Schema Relationships

```
┌──────────────────────────────────────────────────────────────────┐
│                       Database Tables                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  auth.users                                                       │
│  ├── id (UUID) ─────────────────────────────┐                    │
│  └── email, metadata                        │                    │
│                                             │                    │
│                                    ┌────────▼────────┐           │
│                                    │                 │           │
│  user_profiles                     │                 │           │
│  ├── id                            │                 │           │
│  ├── user_id ──────────────────────┤                 │           │
│  ├── full_name                     │                 │           │
│  ├── bio                           │                 │           │
│  ├── date_of_birth                 │                 │           │
│  └── ...other profile fields       │                 │           │
│                                    │                 │           │
│                              ┌─────┴──────┬──────────┴─────┐      │
│                              │            │                │      │
│                              ▼            ▼                ▼      │
│                         community_posts                          │
│                         ├── id                                   │
│                         ├── user_id ──────────────┐              │
│                         ├── content               │              │
│                         ├── images_urls ──────────┼──────┐       │
│                         ├── gif_url               │      │       │
│                         ├── location ───────────┐ │      │       │
│                         ├── poll_id ────────────┼─┼──┐   │       │
│                         ├── scheduled_at        │ │  │   │       │
│                         ├── likes_count         │ │  │   │       │
│                         ├── comments_count      │ │  │   │       │
│                         ├── created_at          │ │  │   │       │
│                         └── updated_at          │ │  │   │       │
│                              ▲                  │ │  │   │       │
│                              │                  │ │  │   │       │
│              ┌───────────────┴───────────────┐  │ │  │   │       │
│              │                               │  │ │  │   │       │
│         posts_likes                    posts_comments  │ │       │
│         ├── id                         ├── id          │ │       │
│         ├── post_id ──────┐            ├── post_id ────┼─┤       │
│         ├── user_id       │            ├── user_id     │ │       │
│         ├── created_at    │            ├── content      │ │       │
│         └── UNIQUE(post, user)         ├── created_at   │ │       │
│                           │            └── updated_at   │ │       │
│                           │                             │ │       │
│                           │                    ┌────────┘ │       │
│                           │                    │          │       │
│                           ▼                    ▼          │       │
│                                            polls          │       │
│                                            ├── id        │       │
│                                            ├── post_id ──┘       │
│                                            ├── question          │
│                                            ├── options[]         │
│                                            └── created_at        │
│                                                 │                │
│                                       ┌─────────▼─────────┐     │
│                                       │                   │     │
│                                   poll_votes              │     │
│                                   ├── id                  │     │
│                                   ├── poll_id ────────────┘     │
│                                   ├── user_id                    │
│                                   ├── option_index               │
│                                   └── UNIQUE(poll, user)         │
│                                                                   │
│  friendships                                                     │
│  ├── id                                                          │
│  ├── user_id                                                     │
│  ├── friend_id                                                   │
│  ├── status (pending|accepted|blocked)                           │
│  └── created_at                                                  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Function Call Hierarchy

```
useEffect (on mount)
├─ initializeCommunity()
│  ├─ getUser() from Supabase Auth
│  └─ Promise.all([
│     ├─ loadFeedPosts()
│     │  └─ Query community_posts + user_profile
│     ├─ loadFriends()
│     │  └─ Query friendships table
│     ├─ loadBlockedUsers()
│     │  └─ Query friendships with blocked status
│     ├─ loadTrendingHashtags()
│     │  ├─ Query last 48h posts
│     │  ├─ Extract hashtags (regex)
│     │  ├─ Count frequency
│     │  └─ Sort by popularity
│     └─ loadUserLikes()
│        └─ Query posts_likes for current user
│
└─ setInterval(loadTrendingHashtags, 30000)
   └─ Auto-refresh trending every 30 seconds


User Input → Event Handlers
│
├─ onChange (textarea) → updateHashtagSuggestions()
│  ├─ Find last # in text
│  ├─ Filter trendingHashtags by match
│  └─ Update hashtagSuggestions state
│
├─ onClick (image button) → handleImageUpload()
│  ├─ FileInput reference
│  ├─ Upload to Storage
│  ├─ Get public URLs
│  └─ Add to selectedImages
│
├─ onClick (location button) → handleGetLocation()
│  ├─ Browser Geolocation API
│  ├─ Get coordinates
│  └─ Set userLocation state
│
├─ onClick (poll button) → setShowPollCreator(true)
│  └─ Show poll creation UI
│
├─ onClick (schedule button) → setScheduledTime()
│  └─ Set datetime 1 hour from now
│
├─ onClick (post button) → handleCreatePost()
│  ├─ Insert into community_posts
│  ├─ Create poll if options provided
│  │  └─ Insert into polls table
│  ├─ loadFeedPosts() (refresh)
│  ├─ loadTrendingHashtags() (refresh)
│  ├─ Reset all composition state
│  └─ Show success message
│
└─ onClick (heart) → handleLikePost()
   ├─ Check if already liked
   ├─ Insert/Delete from posts_likes
   ├─ Update likedPosts state
   ├─ Update post.likes_count
   └─ Refresh feed
```

## Component Rendering Tree

```
Community (Page Component)
│
├─ Layout Container (flex h-screen)
│  │
│  ├─ Left Sidebar (w-64, hidden lg:flex)
│  │  └─ Navigation (Home, Explore, Messages, etc.)
│  │
│  ├─ Center Content (max-w-2xl, w-full)
│  │  │
│  │  ├─ Feed Header (sticky)
│  │  │  └─ "For you"
│  │  │
│  │  ├─ Post Composition
│  │  │  ├─ Avatar
│  │  │  ├─ Textarea with hashtag suggestions dropdown
│  │  │  ├─ Image previews (grid)
│  │  │  ├─ GIF preview
│  │  │  ├─ Location display badge
│  │  │  ├─ Poll creator (conditional)
│  │  │  ├─ Schedule display (conditional)
│  │  │  └─ Action buttons
│  │  │     ├─ Image upload
│  │  │     ├─ Poll creator toggle
│  │  │     ├─ Location
│  │  │     ├─ GIF
│  │  │     ├─ Schedule
│  │  │     ├─ Emoji
│  │  │     └─ Post button
│  │  │
│  │  └─ Feed Posts
│  │     └─ map(feedPosts) → Post Card
│  │        ├─ Avatar (clickable)
│  │        ├─ User info (clickable)
│  │        ├─ Post content
│  │        ├─ Images grid (conditional)
│  │        ├─ GIF (conditional)
│  │        ├─ Location badge (conditional)
│  │        ├─ Poll display (conditional)
│  │        ├─ Schedule indicator (conditional)
│  │        └─ Engagement buttons
│  │           ├─ Comment (with count)
│  │           ├─ Share
│  │           └─ Like (with count, filled if liked)
│  │
│  └─ Right Sidebar (w-80, hidden xl:flex)
│     │
│     ├─ Search input
│     │
│     └─ Conditional content:
│        ├─ IF searchResults.length > 0:
│        │  └─ Search Results
│        │     └─ User cards with Follow/Block buttons
│        │
│        └─ ELSE:
│           └─ What's Happening
│              └─ Trending Hashtags
│                 └─ map(trendingHashtags, 0, 15) → Hashtag Card
│                    ├─ Category & trending label
│                    ├─ Hashtag name (clickable)
│                    ├─ Post count
│                    └─ Menu button (hover)
│
└─ Status Messages (fixed bottom)
   ├─ Error toast (conditional)
   └─ Success toast (conditional)
```

## API & External Services

```
Frontend (React Component)
    │
    ├─── Supabase Auth
    │    └─ getUser(), sign in, sign out
    │
    ├─── Supabase Database
    │    ├─ community_posts
    │    ├─ posts_likes
    │    ├─ posts_comments
    │    ├─ polls
    │    ├─ poll_votes
    │    ├─ user_profiles
    │    ├─ friendships
    │    └─ auth.users
    │
    ├─── Supabase Storage
    │    └─ community-posts bucket
    │
    ├─── Browser APIs (No Key Needed)
    │    ├─ Geolocation API
    │    ├─ FileReader API
    │    └─ LocalStorage
    │
    └─── Optional External APIs
         ├─ Giphy API (GIF search)
         │  └─ @giphy/js-fetch-api
         │
         ├─ Google Maps API (Geocoding)
         │  └─ @react-google-maps/api
         │
         └─ Emoji APIs
            └─ emoji-picker-react
```

## Performance Metrics

```
Operation              Time        Database Rows    Notes
─────────────────────────────────────────────────────────────
Load feed            ~500ms       50 posts         Indexed query
Load friends         ~300ms       Variable         User-specific
Load trending        ~400ms       ALL (48h)        Aggregate query
Upload image         ~1-3s        +1 bucket file   Per image
Like post           ~200ms       +1 likes record  Real-time
Create post         ~800ms       +1 post          All features
Hashtag suggest     ~50ms        Client-side      No DB call
Geolocation         ~3-10s       Browser API      User dependent
Auto-refresh        ~30s         Full scan        Interval-based
```

## Security Model

```
Row Level Security (RLS) Policies

community_posts:
├─ SELECT: Anyone can view
├─ INSERT: Only authenticated users
├─ UPDATE: Only post owner
└─ DELETE: Only post owner

posts_likes:
├─ SELECT: Anyone can view
├─ INSERT: Authenticated user
└─ DELETE: Like owner

posts_comments:
├─ SELECT: Anyone can view
├─ INSERT: Authenticated user
├─ UPDATE: Comment owner
└─ DELETE: Comment owner

polls:
├─ SELECT: Anyone can view
└─ INSERT: Anyone (through post)

poll_votes:
├─ SELECT: Anyone can view
├─ INSERT: Authenticated user
└─ DELETE: Vote owner

friendships:
├─ SELECT: Anyone (friends visible)
├─ INSERT: Authenticated user
└─ DELETE: Friend owner

user_profiles:
├─ SELECT: Anyone can view
├─ UPDATE: Profile owner
└─ DELETE: Profile owner
```

