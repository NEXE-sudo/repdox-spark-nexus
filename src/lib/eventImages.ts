// Map common event image paths (from seed or CMS) to local bundled assets.
// If your Supabase records use these filenames (e.g. "/images/hacksprint.jpg"),
// this helper returns the compiled import so Vite serves the image correctly.

import { supabase } from "@/integrations/supabase/client";
import eventHackathon from "@/assets/event-hackathon.jpg";
import eventMUN from "@/assets/event-mun.jpg";
import eventWorkshop from "@/assets/event-workshop.jpg";
import eventGaming from "@/assets/event-gaming.jpg";

const filenameMap: Record<string, string> = {
  "hacksprint.jpg": eventHackathon,
  "hacksprint-2025.jpg": eventHackathon,
  "hackathon.jpg": eventHackathon,
  "mun.jpg": eventMUN,
  "event-mun.jpg": eventMUN,
  "mun-challenge.jpg": eventMUN,
  "workshop.jpg": eventWorkshop,
  "event-workshop.jpg": eventWorkshop,
  "gaming.jpg": eventGaming,
  "event-gaming.jpg": eventGaming,
};

export function getEventImage(imageUrl?: string | null) {
  if (!imageUrl) return undefined;

  // If it's already an absolute URL (http/https), just return it
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  // Extract filename and try to map to local assets first
  const parts = imageUrl.split("/");
  const filename = parts[parts.length - 1].toLowerCase();
  const mapped = filenameMap[filename];
  if (mapped) return mapped;

  // Otherwise, treat it as a path in the public 'event-images' bucket
  const { data } = supabase.storage.from("event-images").getPublicUrl(imageUrl);
  return data.publicUrl;
}

export async function getEventImageUrl(
  imageUrl?: string | null
): Promise<string | undefined> {
  if (!imageUrl) return undefined;
  
  // Try sync/public first
  const publicUrl = getEventImage(imageUrl);
  if (publicUrl && /^https?:\/\//i.test(publicUrl)) return publicUrl;

  // Fallback to absolute check
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  return publicUrl;
}

