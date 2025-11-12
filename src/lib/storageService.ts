import { supabase } from '@/integrations/supabase/client';

/**
 * Get a signed URL for a storage object. Prefers calling an Edge Function (if VITE_SUPABASE_FUNCTIONS_URL set)
 * which uses the service role key, otherwise falls back to client-side signed URL creation (requires permissions).
 */
export async function getSignedUrl(filePath: string, bucket = 'events', expiresIn = 60 * 60): Promise<string> {
  // Type-safe access to Vite env is declared in vite-env.d.ts
  const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
  if (functionsUrl) {
    const resp = await fetch(`${functionsUrl.replace(/\/$/, '')}/get-signed-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, bucket, expires: expiresIn }),
    });

    if (!resp.ok) throw new Error(`Failed to get signed url from function: ${resp.statusText}`);
    const json = await resp.json();
    if (!json.signedUrl) throw new Error('No signedUrl returned from function');
    return json.signedUrl as string;
  }

  // Fallback: client-side signing (requires appropriate permissions on storage)
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
