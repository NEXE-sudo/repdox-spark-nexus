import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
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

export interface ProfileUpdateData {
  full_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  location?: string | null;
  website?: string | null;
  company?: string | null;
  job_title?: string | null;
}

/**
 * Fetch user profile from the database
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  // Use maybeSingle to avoid PostgREST returning a 406 when no row is found.
  // maybeSingle returns `data` as null if no matching row, without an error.
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

/**
 * Update user profile in the database
 */
export async function updateUserProfile(
  userId: string,
  updates: ProfileUpdateData
): Promise<UserProfile> {
  const updateData = {
    ...updates,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('user_profiles')
    .update(updateData)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new user profile in the database
 */
export async function createUserProfile(
  userId: string,
  profileData: Partial<UserProfile>
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      user_id: userId,
      full_name: profileData.full_name || null,
      bio: profileData.bio || null,
      avatar_url: profileData.avatar_url || null,
      phone: profileData.phone || null,
      location: profileData.location || null,
      website: profileData.website || null,
      company: profileData.company || null,
      job_title: profileData.job_title || null
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Upload avatar to Supabase Storage and return public URL
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  // Enforce max size 2 MB on server-side helper as well
  const MAX_BYTES = 2 * 1024 * 1024; // 2MB
  if (file.size > MAX_BYTES) {
    throw new Error('File too large. Maximum allowed size is 2 MB');
  }

  const ext = file.name.split('.').pop() ?? 'jpg';
  const fileName = `${userId}-${Date.now()}.${ext}`;
  const filePath = `avatars/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  // For private buckets we store the storage path (avatars/...) in DB
  // and return the filePath so caller can request a signed URL for display.
  return filePath;
}

/**
 * Create a temporary signed URL for a private avatar file.
 * Returns a signed URL string valid for `expiresIn` seconds.
 */
export async function getAvatarSignedUrl(filePath: string, expiresIn = 60 * 60): Promise<string> {
  // If a Supabase Edge Function URL is provided via env, use it. The Edge Function
  // will sign the URL using the Service Role key (safer for private buckets).
  const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
  if (functionsUrl) {
    const resp = await fetch(`${functionsUrl.replace(/\/$/, '')}/get-avatar-signed-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, expires: expiresIn }),
    });

    if (!resp.ok) {
      throw new Error(`Failed to get signed url from function: ${resp.statusText}`);
    }

    const json = await resp.json();
    if (!json.signedUrl) throw new Error('No signedUrl returned from function');
    return json.signedUrl as string;
  }

  // Fallback: use client-side signing (requires appropriate permissions)
  const { data, error } = await supabase.storage
    .from('avatars')
    .createSignedUrl(filePath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

/**
 * Delete avatar from Supabase Storage
 */
export async function deleteAvatar(avatarOrPath: string): Promise<void> {
  // Accept either a storage path (avatars/...) or a full public/signed URL
  let filePath = avatarOrPath;
  try {
    const url = new URL(avatarOrPath);
    const parts = url.pathname.split('/');
    const idx = parts.indexOf('avatars');
    if (idx >= 0) filePath = parts.slice(idx).join('/');
  } catch (e) {
    // not a url, assume it's already a path
  }

  const { error } = await supabase.storage
    .from('avatars')
    .remove([filePath]);

  if (error) throw error;
}
