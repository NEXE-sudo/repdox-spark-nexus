// storageService.ts - Fixed version without Edge Functions

import { supabase } from "@/integrations/supabase/client";

/**
 * Get signed URL for private storage files
 * Uses Supabase's built-in createSignedUrl (no Edge Functions needed)
 *
 * @param filePath - Path to the file in storage
 * @param bucket - Bucket name
 * @param expiresIn - Seconds until URL expires (default 1 hour)
 * @returns Signed URL
 */
export async function getSignedUrl(
  filePath: string,
  bucket: string = "event-images",
  expiresIn: number = 3600
): Promise<string> {
  try {

    // Clean the path
    let cleanPath = filePath;

    // Remove leading slash
    if (cleanPath.startsWith("/")) {
      cleanPath = cleanPath.substring(1);
    }

    // Remove bucket name if accidentally included
    if (cleanPath.startsWith(`${bucket}/`)) {
      cleanPath = cleanPath.replace(`${bucket}/`, "");
    }

    // Use Supabase's built-in createSignedUrl method
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(cleanPath, expiresIn);

    if (error) {
      console.error("[getSignedUrl] Error:", error);
      throw error;
    }

    if (!data?.signedUrl) {
      throw new Error("No signed URL returned");
    }

    return data.signedUrl;
  } catch (error) {
    console.error("[getSignedUrl] Exception:", error);
    throw error;
  }
}

/**
 * Get public URL for private buckets with RLS
 * This works because Supabase client includes auth token automatically
 *
 * @param filePath - Path to file
 * @param bucket - Bucket name
 * @returns Public URL (requires auth to access via RLS)
 */
export function getPublicUrl(filePath: string, bucket: string): string {
  // Clean the path
  let cleanPath = filePath;

  // Remove leading slash
  if (cleanPath.startsWith("/")) {
    cleanPath = cleanPath.substring(1);
  }

  // Remove bucket name if accidentally included
  if (cleanPath.startsWith(`${bucket}/`)) {
    cleanPath = cleanPath.replace(`${bucket}/`, "");
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath);

  return data.publicUrl;
}

/**
 * Upload file to storage
 *
 * @param file - File to upload
 * @param bucket - Bucket name
 * @param userId - User ID (for folder organization)
 * @returns File path in storage
 */
export async function uploadFile(
  file: File,
  bucket: string,
  userId: string
): Promise<string> {
  try {
    // Validate file
    if (!file.type.startsWith("image/")) {
      throw new Error("Only image files are allowed");
    }

    const maxSize = bucket === "avatars" ? 5242880 : 52428800; // 5MB or 50MB
    if (file.size > maxSize) {
      const maxMB = maxSize / 1048576;
      throw new Error(`File size must be less than ${maxMB}MB`);
    }

    // Generate file path
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;


    // Upload
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("[uploadFile] Upload error:", error);
      throw error;
    }

    return fileName;
  } catch (error) {
    console.error("[uploadFile] Exception:", error);
    throw error;
  }
}

/**
 * Delete file from storage
 *
 * @param filePath - Path to file
 * @param bucket - Bucket name
 */
export async function deleteFile(
  filePath: string,
  bucket: string
): Promise<void> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([filePath]);

    if (error) throw error;
  } catch (error) {
    console.error("[deleteFile] Error:", error);
    throw error;
  }
}
