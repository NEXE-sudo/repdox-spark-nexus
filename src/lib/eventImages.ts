// Map common event image paths (from seed or CMS) to local bundled assets.
// If your Supabase records use these filenames (e.g. "/images/hacksprint.jpg"),
// this helper returns the compiled import so Vite serves the image correctly.

import eventHackathon from '@/assets/event-hackathon.jpg';
import eventMUN from '@/assets/event-mun.jpg';
import eventWorkshop from '@/assets/event-workshop.jpg';
import eventGaming from '@/assets/event-gaming.jpg';

const filenameMap: Record<string, string> = {
  'hacksprint.jpg': eventHackathon,
  'hacksprint-2025.jpg': eventHackathon,
  'hackathon.jpg': eventHackathon,
  'mun.jpg': eventMUN,
  'event-mun.jpg': eventMUN,
  'mun-challenge.jpg': eventMUN,
  'workshop.jpg': eventWorkshop,
  'event-workshop.jpg': eventWorkshop,
  'gaming.jpg': eventGaming,
  'event-gaming.jpg': eventGaming,
};

export function getEventImage(imageUrl?: string | null) {
  if (!imageUrl) return undefined;

  // If it's already an absolute URL (http/https), just return it
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  // Extract filename and try to map
  const parts = imageUrl.split('/');
  const filename = parts[parts.length - 1].toLowerCase();
  return filenameMap[filename];
}

// Async helper: if imageUrl is a storage path (not an http url and not mapped),
// attempt to get a signed URL via storageService.getSignedUrl. Otherwise behave like getEventImage.
import { getSignedUrl } from './storageService';

export async function getEventImageUrl(imageUrl?: string | null): Promise<string | undefined> {
  if (!imageUrl) return undefined;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  const parts = imageUrl.split('/');
  const filename = parts[parts.length - 1].toLowerCase();
  const mapped = filenameMap[filename];
  if (mapped) return mapped;

  // Treat as storage path in 'events' bucket and try to get signed url
  try {
    const signed = await getSignedUrl(imageUrl, 'events', 60 * 60);
    return signed;
  } catch (e) {
    // fallback: return the original path so caller can decide
    console.error('Failed to get signed url for event image', e);
    return imageUrl;
  }
}
