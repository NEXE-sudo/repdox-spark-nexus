# User Profiles Database Integration

This document outlines the setup and integration of the `user_profiles` table for structured user profile data management.

## Overview

The application now uses a dedicated `user_profiles` table in Supabase to store structured user profile information separately from Supabase Auth metadata. This provides:

- **Better data organization**: Profile fields are stored in a dedicated table
- **Scalability**: Easy to add new profile fields without modifying auth
- **RLS security**: Row-level security policies ensure users only access their own data
- **Type safety**: TypeScript interfaces for profile data

## Database Schema

### Table: `user_profiles`

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  phone TEXT,
  location TEXT,
  website TEXT,
  company TEXT,
  job_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Fields

- **id**: Unique identifier (UUID)
- **user_id**: Foreign key to `auth.users` - establishes 1:1 relationship
- **full_name**: User's full name
- **bio**: User biography/description
- **avatar_url**: URL to user's profile picture (from Supabase Storage)
- **phone**: Contact phone number
- **location**: Geographic location (city, country, etc.)
- **website**: Personal or professional website URL
- **company**: Organization/company name
- **job_title**: Job title or position
- **created_at**: Profile creation timestamp
- **updated_at**: Last profile update timestamp

## Deployment

### 1. Run the Migration

Navigate to your Supabase project's SQL Editor and run the migration file:

```bash
# File: supabase/migrations/20251112_create_user_profiles_table.sql
```

This migration creates:
- The `user_profiles` table with all fields
- Unique constraint on `user_id` (1:1 relationship)
- Foreign key with CASCADE DELETE
- RLS policies for user-only access
- Automatic profile creation trigger on new user signup
- Indices for query performance

### 2. Set Up Storage Bucket

In your Supabase dashboard:

1. Go to **Storage** → **Buckets**
2. Create a new public bucket named `avatars`
3. Set policies to allow authenticated users to upload and read
4. (Optional) Configure CORS if uploading from different domain

### 3. Verify RLS Policies

The migration includes the following RLS policies:

- **SELECT**: Users can read only their own profile
- **UPDATE**: Users can update only their own profile
- **INSERT**: Users can insert only their own profile
- **DELETE**: Disabled (prevent accidental deletion)

## Code Integration

### Service Layer

File: `src/lib/profileService.ts`

Provides functions for profile operations:

```typescript
// Fetch user profile
const profile = await getUserProfile(userId);

// Update profile
await updateUserProfile(userId, {
  full_name: "John Doe",
  job_title: "Engineer"
});

// Create new profile
await createUserProfile(userId, profileData);

// Upload avatar to storage
const avatarUrl = await uploadAvatar(userId, file);

// Delete avatar from storage
await deleteAvatar(avatarUrl);
```

### Profile Page

File: `src/pages/Profile.tsx`

Features:
- Read/write profile data from `user_profiles` table
- Avatar upload to Supabase Storage
- Edit form with sections for:
  - Personal Info (name, bio)
  - Professional (job title, company, website)
  - Contact (email, phone, location)

### Navigation Component

File: `src/components/Nav.tsx`

Enhancements:
- Reads avatar URL from `user_profiles` table (primary)
- Falls back to user metadata and OAuth identity data
- Displays initials when avatar is unavailable
- Reads full name from profile table for initials generation

## Handling Existing Users

If you have existing users with data in `user_metadata`:

### Option 1: Manual Migration

Run a one-time script to backfill existing user profiles:

```sql
-- Backfill user_profiles from auth.users metadata
INSERT INTO user_profiles (user_id, full_name, bio, avatar_url, phone, location, website, company, job_title)
SELECT
  id,
  (user_metadata->>'full_name')::TEXT,
  (user_metadata->>'bio')::TEXT,
  (user_metadata->>'avatar_url')::TEXT,
  (user_metadata->>'phone')::TEXT,
  (user_metadata->>'location')::TEXT,
  (user_metadata->>'website')::TEXT,
  (user_metadata->>'company')::TEXT,
  (user_metadata->>'job_title')::TEXT
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_profiles);
```

### Option 2: Lazy Migration

The code handles non-existent profiles gracefully. Profiles are created automatically when:
1. New users sign up (via trigger)
2. Users first visit the profile page (if needed)

## Avatar Upload

### Process

1. User selects image file
2. File uploaded to `avatars/` bucket in Supabase Storage
3. Public URL generated and stored in `user_profiles.avatar_url`
4. Avatar displayed in:
   - Profile page
   - Navbar/avatar menu

### Supported Formats

- JPEG, PNG, WebP, GIF (any image type)
- Recommended: JPEG/PNG for compatibility
- Maximum size: 5MB (configurable in Supabase dashboard)

## API Patterns

### Reading Profile Data

```typescript
// From Profile.tsx
const { data: profileData } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('user_id', userId)
  .single();
```

### Updating Profile Data

```typescript
const { data: updated } = await supabase
  .from('user_profiles')
  .update({
    full_name: "New Name",
    bio: "Updated bio"
  })
  .eq('user_id', userId)
  .select('*')
  .single();
```

### Avatar Upload

```typescript
// Upload file to Storage
const { error } = await supabase.storage
  .from('avatars')
  .upload(`avatars/${userId}-${timestamp}.ext`, file);

// Get public URL
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl(`avatars/${userId}-${timestamp}.ext`);
```

## RLS Policies Explained

All policies are scoped to the authenticated user:

```sql
-- Users can only see their own profile
CREATE POLICY "Users can select own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

## Troubleshooting

### Profile Not Showing

1. Check RLS policies are enabled
2. Verify user is authenticated
3. Check browser console for errors
4. Ensure `user_profiles` table exists

### Avatar Not Uploading

1. Verify `avatars` bucket exists and is public
2. Check CORS settings if cross-domain
3. Verify file size < 5MB
4. Check browser console for upload errors
5. Verify Storage permissions in Supabase dashboard

### Trigger Not Creating Profile

1. Verify trigger function exists: `handle_new_user()`
2. Verify trigger exists: `on_auth_user_created`
3. Check Supabase function logs for errors
4. Manually create profile for existing users

## Future Enhancements

- Profile image cropping
- Multiple avatar variants (thumbnail, full size)
- Profile visibility settings
- Social links (LinkedIn, GitHub, Twitter, etc.)
- Verified badges
- Profile completion percentage
- Profile view history

## Files Modified

- `src/pages/Profile.tsx` - Updated to use `user_profiles` table
- `src/components/Nav.tsx` - Reads avatar from profile table
- `src/lib/profileService.ts` - New service layer for profile operations
- `supabase/migrations/20251112_create_user_profiles_table.sql` - Database schema

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/sql-createtrigger.html)
