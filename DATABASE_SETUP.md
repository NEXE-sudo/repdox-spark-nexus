# Database Setup Guide for Community Features

## Required Supabase Migrations

To use the Community and Profile features, you need to apply the following migrations to your Supabase database.

### Step 1: Navigate to Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project
3. Go to **SQL Editor**

### Step 2: Run Each Migration

Copy and paste each SQL script below into the SQL Editor and execute them in order.

**Note:** The `date_of_birth` column already exists in the `user_profiles` table, so we only need to create the Community tables.

---

## Migration 1: Create Community Posts Table

```sql
-- Create community_posts table for user posts/updates
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);

-- Enable RLS
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view posts
CREATE POLICY "Posts are viewable by everyone" ON community_posts
  FOR SELECT USING (true);

-- Policy: Users can create their own posts
CREATE POLICY "Users can create their own posts" ON community_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own posts
CREATE POLICY "Users can update their own posts" ON community_posts
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own posts
CREATE POLICY "Users can delete their own posts" ON community_posts
  FOR DELETE USING (auth.uid() = user_id);
```

**Purpose:** Creates a table for users to post updates and content in the community feed.

---

## Migration 3: Create Friendships Table

```sql
-- Create friendships table for friend requests, friendships, and blocks
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, friend_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view friendships involving them
CREATE POLICY "Users can view their own friendships" ON friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Policy: Users can create friendship requests
CREATE POLICY "Users can create friendship requests" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own friendship requests (accept/reject)
CREATE POLICY "Users can update their own friendships" ON friendships
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Policy: Users can delete their own friendships
CREATE POLICY "Users can delete their own friendships" ON friendships
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);
```

**Purpose:** Creates a table to manage friend requests, friendships, and user blocks.

---

## Verification Checklist

After running both migrations, verify:

- [ ] `community_posts` table created successfully
- [ ] `friendships` table created successfully
- [ ] All indexes created
- [ ] RLS policies enabled and configured
- [ ] `date_of_birth` column exists in `user_profiles`

## Testing the Setup

1. **Test Community Feed:**
   - Go to /community
   - Create a post
   - Verify it appears in the feed

2. **Test User Search:**
   - Go to /community and click "People"
   - Search for other users
   - Verify results appear

3. **Test Friend Features:**
   - Try adding a friend
   - Verify the request is created
   - Check Friends tab to see relationships

4. **Test Date of Birth:**
   - Go to /profile
   - The Date of Birth field should be in Personal Information
   - Add or update your date of birth
   - Save and refresh to verify it persists

## Troubleshooting

**Issue:** Table already exists error
- **Solution:** This is normal if you run migrations multiple times. The `IF NOT EXISTS` clauses prevent errors.

**Issue:** RLS policy already exists
- **Solution:** Create new policy with a different name or drop and recreate it.

**Issue:** Foreign key constraint fails
- **Solution:** Ensure `auth.users` table exists and is accessible in your Supabase project.

**Issue:** Cannot see other users in search
- **Solution:** Make sure other users have created profiles (go to /profile to create one).

## Additional Notes

- All tables use UUID for primary keys
- Timestamps are automatically set on creation
- RLS is enabled for data security
- Indexes are created for common query patterns
- Cascading deletes ensure data consistency when users are deleted

For more help, consult the [Supabase Documentation](https://supabase.com/docs).
