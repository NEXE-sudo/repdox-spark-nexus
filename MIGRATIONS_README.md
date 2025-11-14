# Database Migrations for Like Persistence Fix

This document outlines the migrations needed to fix the likes persistence issue and refactor the likes system.

## Migrations to Run (in order):

### 1. `20251114_add_handle_to_profiles.sql`

- Adds `handle` column to user_profiles table (for @handle mentions)
- Creates index for fast lookups

### 2. `20251114_add_fk_community_posts.sql`

- Adds foreign key constraints between tables for proper relationships
- Enables Supabase to resolve `user_profile:user_id` relationship queries
- Fixes "Could not find a relationship" errors

### 3. `20251114_refactor_likes_system.sql` ⭐ **IMPORTANT - Run this first**

- Creates new tables: `user_post_likes` and `user_poll_votes`
- Adds `likes_count` and `votes_count` columns to community_posts and polls
- Migrates existing data from old tables
- Sets up RLS policies for new tables
- **This ensures likes_count is persisted in the database**

### 4. `20251114_drop_old_likes_tables.sql`

- Drops `posts_likes` table (data migrated)
- Drops `poll_votes` table (data migrated)
- **Run ONLY after confirming likes migration worked**

## What Changed in Code:

### Community.tsx & CommentDetail.tsx

1. `loadUserLikes()` - Now reads from `user_post_likes` instead of `posts_likes`
2. `handleLikePost()` - Now:
   - Saves user like preference to `user_post_likes`
   - Updates `likes_count` in `community_posts` table
   - Ensures persistence across page reloads

### Data Persistence

- **Before**: likes_count only in local state, no database persistence
- **After**: likes_count stored in `community_posts.likes_count`, synced to database on each like/unlike

## Deployment Steps:

```bash
# Push all migrations
supabase db push

# This will execute migrations in order:
# 1. 20251114_add_handle_to_profiles.sql
# 2. 20251114_add_fk_community_posts.sql
# 3. 20251114_refactor_likes_system.sql
# 4. 20251114_drop_old_likes_tables.sql
```

## Expected Results:

✅ Likes persist across page reloads
✅ Like count updates properly in database
✅ User like tracking works with new `user_post_likes` table
✅ No more "Could not find relationship" errors
✅ Comments work properly with loaded posts
✅ Poll voting infrastructure ready (similar structure to likes)
