# Quick Reference: User Profiles System

## TL;DR - Just Deploy This

### 1. Run Migration
Copy entire file contents to Supabase SQL Editor → Run:
```
supabase/migrations/20251112_create_user_profiles_table.sql
```

### 2. Create Storage Bucket
Supabase Dashboard → Storage → New Bucket → Name: `avatars` → Make Public

### 3. Done! 
Your profile system is live.

---

## Database Tables

### `user_profiles`
- `id` - UUID primary key
- `user_id` - FK to auth.users (unique, 1:1 relationship)
- `full_name` - string
- `bio` - string
- `avatar_url` - string (URL to storage)
- `phone` - string
- `location` - string
- `website` - string
- `company` - string
- `job_title` - string
- `created_at` - timestamp
- `updated_at` - timestamp

---

## Frontend Components

### Profile Page (`src/pages/Profile.tsx`)
- Location: `/profile`
- Features: Edit form, avatar upload, all profile fields
- Auto-redirects to signin if not authenticated
- Sections: Personal, Professional, Contact

### Navigation (`src/components/Nav.tsx`)
- Reads avatar from `user_profiles.avatar_url`
- Falls back to OAuth metadata
- Shows user initials if no avatar
- Profile/Logout menu

---

## Service Functions (`src/lib/profileService.ts`)

```typescript
// Read profile
getUserProfile(userId: string) → UserProfile

// Update profile  
updateUserProfile(userId, updates) → UserProfile

// Create profile
createUserProfile(userId, data) → UserProfile

// Upload avatar file
uploadAvatar(userId, file: File) → string (URL)

// Delete avatar from storage
deleteAvatar(avatarUrl: string) → void
```

---

## RLS Protection

All queries are scoped to authenticated user:
- Cannot read other users' profiles
- Cannot update other users' data
- Admin bypass possible via service key

---

## Common Scenarios

### User Signs Up
```
Signup → Auth creates auth.users record
       → Trigger creates empty user_profiles record
       → User redirected to /profile to fill in details
```

### User Uploads Avatar
```
Profile page → File select → uploadAvatar()
          → Stored in avatars/ bucket → URL saved to user_profiles.avatar_url
          → Avatar displayed in navbar on next load
```

### User Edits Profile
```
Profile page → Fill form → Click Save
          → updateUserProfile() → DB updated
          → Success message shown
          → Next login loads updated data
```

---

## Type Definitions

```typescript
interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  phone: string | null;
  location: string | null;
  website: string | null;
  company: string | null;
  job_title: string | null;
  created_at: string;
  updated_at: string;
}
```

---

## API Endpoints

### Read Profile
```typescript
const { data } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('user_id', userId)
  .single();
```

### Update Profile
```typescript
const { data } = await supabase
  .from('user_profiles')
  .update({ full_name: 'John' })
  .eq('user_id', userId)
  .select()
  .single();
```

### Insert Profile
```typescript
const { data } = await supabase
  .from('user_profiles')
  .insert({
    user_id: userId,
    full_name: 'John Doe'
  })
  .select()
  .single();
```

---

## Storage Bucket

### Name: `avatars`
- Public bucket (images viewable by anyone)
- Path structure: `avatars/{userId}-{timestamp}.{ext}`
- Max file size: 5MB (configurable)

### Upload File
```typescript
const { error } = await supabase.storage
  .from('avatars')
  .upload(`avatars/${userId}-${Date.now()}.jpg`, file);
```

### Get Public URL
```typescript
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl(`avatars/${fileName}`);
  
const publicUrl = data.publicUrl; // Use this in img src
```

---

## Environment Check

Required `.env.local` variables:
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Both should already be configured.

---

## Verify Installation

```bash
# 1. Check migration ran
Supabase Dashboard → SQL Editor → Run:
SELECT * FROM user_profiles LIMIT 1;
# Should return table structure (might be empty)

# 2. Check bucket exists
Supabase Dashboard → Storage → Should see "avatars" bucket

# 3. Visit profile page
Navigate to http://localhost:5173/profile
# Should load profile page (signin if not authenticated)
```

---

## Troubleshooting Checklist

- [ ] Migration deployed in Supabase SQL Editor?
- [ ] `avatars` bucket created and set to Public?
- [ ] Typescript compiles without errors? (`npm run build`)
- [ ] Can access `/profile` page?
- [ ] Can upload avatar?
- [ ] Can edit profile fields?
- [ ] Data persists after page refresh?
- [ ] Navbar shows avatar?

---

## Emergency: Reset/Rebuild

If something goes wrong:

```sql
-- Drop everything (WARNING: deletes all profile data)
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Then re-run migration from scratch:
-- Copy supabase/migrations/20251112_create_user_profiles_table.sql to SQL Editor
```

---

## Stats

- Lines of code added: ~500
- New files: 3 (profileService.ts, migration, docs)
- Modified files: 2 (Profile.tsx, Nav.tsx, types.ts)
- Database tables created: 1
- RLS policies: 3 (SELECT, UPDATE, INSERT)
- Trigger functions: 1
- Storage buckets needed: 1

---

## Resources

- Full guide: `docs/USER_PROFILES_SETUP.md`
- Deployment steps: `DEPLOYMENT_GUIDE.md`
- Migration file: `supabase/migrations/20251112_create_user_profiles_table.sql`
- Service layer: `src/lib/profileService.ts`

---

**Status**: ✅ Ready to deploy
**Next action**: Run migration in Supabase SQL Editor
