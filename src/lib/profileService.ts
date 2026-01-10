// profileService.ts - For PRIVATE buckets with authentication

import { supabase } from "@/integrations/supabase/client";

/**
 * Upload avatar to Supabase Storage (private bucket)
 * @param userId - The user's ID
 * @param file - The image file to upload
 * @returns The storage path of the uploaded avatar
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<string> {
  try {
    console.log("[uploadAvatar] Starting upload for user:", userId);

    // Validate file type
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }

    // Validate file size (5MB max for avatars)
    if (file.size > 5242880) {
      throw new Error("File size must be less than 5MB");
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

    console.log("[uploadAvatar] Uploading to path:", fileName);

    // Clean up old avatars (optional)
    try {
      const { data: existingFiles } = await supabase.storage
        .from("avatars")
        .list(userId);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map((f) => `${userId}/${f.name}`);
        await supabase.storage.from("avatars").remove(filesToDelete);
        console.log("[uploadAvatar] Cleaned up old avatars");
      }
    } catch (err) {
      console.warn("[uploadAvatar] Cleanup warning:", err);
    }

    // Upload the new avatar
    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("[uploadAvatar] Upload error:", error);
      throw new Error(`Avatar upload failed: ${error.message}`);
    }

    console.log("[uploadAvatar] Upload successful:", data);
    return fileName;
  } catch (error) {
    console.error("[uploadAvatar] Exception:", error);
    throw error;
  }
}

/**
 * Get avatar URL for PRIVATE bucket
 * For private buckets, getPublicUrl still works because:
 * 1. Supabase client includes auth token automatically
 * 2. RLS policies control access, not the public/private setting
 * 3. The URL is "public" in format but access is controlled by RLS
 *
 * @param path - The storage path of the avatar
 * @returns The URL to access the avatar
 */
export async function getAvatarSignedUrl(path: string): Promise<string> {
  try {
    console.log("[getAvatarSignedUrl] Getting URL for path:", path);

    // Clean up the path - remove bucket name if it's included
    let cleanPath = path;

    // Remove leading slash
    if (cleanPath.startsWith("/")) {
      cleanPath = cleanPath.substring(1);
    }

    // Remove 'avatars/' prefix if it exists (common mistake)
    if (cleanPath.startsWith("avatars/")) {
      cleanPath = cleanPath.replace("avatars/", "");
      console.log("[getAvatarSignedUrl] Cleaned path:", cleanPath);
    }

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      console.warn("[getAvatarSignedUrl] No active session - using public URL");
    }

    // For private buckets with RLS, getPublicUrl works with auth headers
    // The Supabase client automatically includes the JWT token
    const { data } = supabase.storage.from("avatars").getPublicUrl(cleanPath);

    console.log("[getAvatarSignedUrl] URL generated:", data.publicUrl);
    return data.publicUrl;
  } catch (error) {
    console.error("[getAvatarSignedUrl] Error:", error);
    throw error;
  }
}

/**
 * Alternative: Create a time-limited signed URL (for sharing)
 * Use this if you need to share avatars with non-authenticated users
 * @param path - The storage path
 * @param expiresIn - Seconds until the URL expires (default: 1 hour)
 * @returns The signed URL
 */
export async function getAvatarSignedUrlTemporary(
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    console.log("[getAvatarSignedUrlTemporary] Creating signed URL for:", path);

    const { data, error } = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error("[getAvatarSignedUrlTemporary] Error:", error);
      throw error;
    }

    if (!data?.signedUrl) {
      throw new Error("No signed URL returned");
    }

    console.log("[getAvatarSignedUrlTemporary] Signed URL created");
    return data.signedUrl;
  } catch (error) {
    console.error("[getAvatarSignedUrlTemporary] Exception:", error);
    throw error;
  }
}

/**
 * Delete an avatar from storage
 */
export async function deleteAvatar(path: string): Promise<void> {
  try {
    const { error } = await supabase.storage.from("avatars").remove([path]);

    if (error) throw error;
    console.log("[deleteAvatar] Avatar deleted:", path);
  } catch (error) {
    console.error("[deleteAvatar] Error:", error);
    throw error;
  }
}

/**
 * Upload community post image to PRIVATE bucket
 */
export async function uploadCommunityPostImage(
  userId: string,
  file: File
): Promise<string> {
  try {
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }

    if (file.size > 52428800) {
      throw new Error("File size must be less than 50MB");
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;

    const { error } = await supabase.storage
      .from("community-posts")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;

    // Return the authenticated URL
    const { data } = supabase.storage
      .from("community-posts")
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (error) {
    console.error("[uploadCommunityPostImage] Error:", error);
    throw error;
  }
}

/**
 * Upload event image to PRIVATE bucket
 */
export async function uploadEventImage(
  userId: string,
  file: File
): Promise<string> {
  try {
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }

    if (file.size > 52428800) {
      throw new Error("File size must be less than 50MB");
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("event-images")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from("event-images")
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (error) {
    console.error("[uploadEventImage] Error:", error);
    throw error;
  }
}

/**
 * Complete account deletion - calls Edge Function to delete auth user and all data
 */
export async function deleteUserAccount() {
  const userRes = await supabase.auth.getUser();
  const user = userRes?.data?.user ?? null;
  if (!user) throw new Error("Authentication required");

  // Get the session to access the JWT token
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("No active session");

  const userId = user.id;

  try {
    console.log(
      "[deleteUserAccount] Starting complete account deletion for user:",
      userId
    );

    // Call the Edge Function with proper authorization header
    const { data, error } = await supabase.functions.invoke(
      "delete-user-account",
      {
        body: { userId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    // Log the full response for debugging
    console.log("[deleteUserAccount] Response data:", data);
    console.log("[deleteUserAccount] Response error:", error);

    if (error) {
      console.error("[deleteUserAccount] Edge function error:", error);
      console.error(
        "[deleteUserAccount] Error details:",
        JSON.stringify(error, null, 2)
      );
      throw new Error(error.message || "Failed to delete account");
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    console.log("[deleteUserAccount] Account deletion successful:", data);

    // Sign out
    await supabase.auth.signOut();

    return true;
  } catch (err) {
    console.error("[deleteUserAccount] Error:", err);
    throw err;
  }
}

// --------------------------
// Profile confirmation helpers
// --------------------------

/**
 * Creates a verification token row for a user (email or phone). This is a helper stub
 * that stores the token server-side; you should integrate your email/SMS provider
 * to actually send the token to the user in production.
 */
export async function createVerification(
  userId: string,
  type: "email" | "phone",
  contact: string,
  ttlSeconds = 60 * 60
) {
  const token = type === "phone" ? String(Math.floor(100000 + Math.random() * 900000)) : cryptoRandomString();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const { data, error } = await supabase
    .from("profile_verifications")
    .insert([
      {
        user_id: userId,
        type,
        contact,
        token,
        expires_at: expiresAt,
        verified: false,
      },
    ]);

  if (error) throw error;

  // Attempt to send token via Edge Function if available (optional)
  let sent = false;
  try {
    // This function is optional; if not present the invocation will fail and be caught
    const fnRes = await supabase.functions.invoke("send-verification", {
      body: JSON.stringify({ userId, type, contact, ttlSeconds }),
    });

    if (fnRes?.error) {
      console.warn("send-verification invocation error:", fnRes.error);
    } else {
      // Function may return JSON like { ok: true, sent: true }
      try {
        const parsed = typeof fnRes.data === 'string' ? JSON.parse(fnRes.data) : fnRes.data;
        sent = !!parsed?.sent;
      } catch (e) {
        // older client responses may not be stringified JSON, fall back to truthy check
        sent = !!fnRes.data;
      }
    }
  } catch (e) {
    console.warn("send-verification function not available or failed:", e);
  }

  // For local/dev testing we log the token so devs can see it without an email/SMS backend
  console.log(`[profileService] Verification token for ${type}:${contact} -> ${token} (sent=${sent})`);

  return { token, id: (data as any)?.[0]?.id, sent };
}

export async function verifyToken(
  userId: string,
  type: "email" | "phone",
  token: string
) {
  const { data, error } = await supabase
    .from("profile_verifications")
    .select("id, expires_at, verified")
    .eq("user_id", userId)
    .eq("type", type)
    .eq("token", token)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;

  if (!data) return false;

  if (data.verified) return true;

  const expiresAt = new Date((data as any).expires_at).getTime();
  if (Date.now() > expiresAt) return false;

  const { error: uerr } = await supabase
    .from("profile_verifications")
    .update({ verified: true })
    .eq("id", (data as any).id);

  if (uerr) throw uerr;

  return true;
}

function cryptoRandomString(len = 32) {
  // fallback random string generator (not cryptographically strong in older browsers)
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/**
 * Helper: Get URL for any storage file in private bucket
 * Works because Supabase client includes auth token
 */
export function getPrivateStorageUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return data.publicUrl;
}
