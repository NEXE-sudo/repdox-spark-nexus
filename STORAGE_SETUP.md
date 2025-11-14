# Supabase Storage Setup Guide

This guide explains how to configure RLS (Row-Level Security) policies for the storage buckets used by the application.

## Overview

The application uses two private storage buckets:
- **avatars** – for user profile pictures
- **events** – for event cover images

Both buckets have RLS enabled, which means you must configure policies to allow uploads and reads.

## Why Policies Are Needed

Without policies, authenticated requests to storage will fail with:
```
Error: new row violates row-level security policy
```

This is expected behavior for secure storage buckets. Policies define who can upload, read, update, and delete files.

## Setup Steps

### 1. Access the Supabase Dashboard

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Log in and select your project
3. Click **Storage** in the left sidebar

### 2. Configure the **avatars** Bucket

#### 2.1 Add INSERT Policy (Allow authenticated users to upload)

1. Click the **avatars** bucket
2. Go to the **Policies** tab
3. Click **New Policy** → **CREATE as template**
4. Fill in the form:
   - **Name:** `Users can upload own avatars`
   - **Allowed roles:** Select **authenticated** checkbox
   - **MIME types:** Leave empty (allow all file types)
   - **Search path:** Leave empty or enter `avatars/` (optional)
   - **Click "Save"**

#### 2.2 Add SELECT Policy (Allow reading avatars)

1. In the **Policies** tab, click **New Policy** → **SELECT as template**
2. Fill in the form:
   - **Name:** `Users can read avatars`
   - **Allowed roles:** Select **authenticated** checkbox
   - Leave conditions empty (allow all)
   - **Click "Save"**

#### 2.3 Add UPDATE Policy (Allow updating avatars)

1. Click **New Policy** → **UPDATE as template**
2. Fill in the form:
   - **Name:** `Users can update avatars`
   - **Allowed roles:** Select **authenticated** checkbox
   - Leave conditions empty
   - **Click "Save"**

#### 2.4 Add DELETE Policy (Allow deleting avatars)

1. Click **New Policy** → **DELETE as template**
2. Fill in the form:
   - **Name:** `Users can delete avatars`
   - **Allowed roles:** Select **authenticated** checkbox
   - Leave conditions empty
   - **Click "Save"**

### 3. Configure the **events** Bucket

Repeat the same steps as above for the **events** bucket, but also add a **public SELECT policy**:

#### 3.1 Add INSERT Policy

- **Name:** `Users can upload event images`
- **Allowed roles:** Select **authenticated** checkbox
- **Click "Save"**

#### 3.2 Add SELECT Policy (Authenticated)

- **Name:** `Users can read event images (authenticated)`
- **Allowed roles:** Select **authenticated** checkbox
- **Click "Save"**

#### 3.3 Add SELECT Policy (Public)

1. Click **New Policy** → **SELECT as template**
2. Fill in the form:
   - **Name:** `Anyone can read event images`
   - **Allowed roles:** Leave empty or select **public** (this makes images readable without authentication)
   - **Click "Save"**

#### 3.4 Add UPDATE Policy

- **Name:** `Users can update event images`
- **Allowed roles:** Select **authenticated** checkbox
- **Click "Save"**

#### 3.5 Add DELETE Policy

- **Name:** `Users can delete event images`
- **Allowed roles:** Select **authenticated** checkbox
- **Click "Save"**

## Verification

After setting up the policies:

1. Go to your app and sign in
2. Navigate to the **Profile** page
3. Try uploading an avatar
4. Check the browser DevTools (F12) → **Network** tab
5. Look for a POST request to `storage/v1/object/avatars/...`
6. If the request returns **200 OK**, the upload succeeded
7. Check the Supabase dashboard → **Storage** → **avatars** to confirm the file appears

## Summary Table

| Bucket | Policy | Roles | Condition |
|--------|--------|-------|-----------|
| avatars | Users can upload own avatars | authenticated | none |
| avatars | Users can read avatars | authenticated | none |
| avatars | Users can update avatars | authenticated | none |
| avatars | Users can delete avatars | authenticated | none |
| events | Users can upload event images | authenticated | none |
| events | Users can read event images (authenticated) | authenticated | none |
| events | Anyone can read event images | public | none |
| events | Users can update event images | authenticated | none |
| events | Users can delete event images | authenticated | none |

## Troubleshooting

### Upload still fails with "new row violates row-level security policy"

- Verify all policies above have been created
- Ensure the user is signed in (authenticated)
- Clear browser cache and reload the page
- Check Supabase project status (no outages)

### Images don't display

- For avatars: Images are stored with paths relative to the bucket root. The app generates signed URLs at runtime.
- Ensure the signed URL Edge Function is deployed (see `DEPLOYMENT_GUIDE.md`)
- Check that `VITE_SUPABASE_FUNCTIONS_URL` is set in `.env`

### Permission Denied errors

- Ensure the policies use **authenticated** role, not a specific user role
- Verify the authenticated user is the one making the request (not a service account)

## References

- [Supabase Storage RLS Documentation](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Dashboard Storage Policies](https://app.supabase.com)
