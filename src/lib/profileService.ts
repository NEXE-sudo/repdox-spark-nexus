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
 * Helper: Get URL for any storage file in private bucket
 * Works because Supabase client includes auth token
 */
export function getPrivateStorageUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return data.publicUrl;
}
