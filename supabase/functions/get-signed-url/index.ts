// Supabase Edge Function (Deno) to create signed URLs for private storage objects.
// Deploy using the Supabase CLI: `supabase functions deploy get-signed-url`.

// Use explicit URL imports so the Supabase bundler can resolve dependencies.
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in env');
}

const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_SERVICE_ROLE_KEY ?? '');

serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    const { path, bucket = 'events', expires = 3600 } = await req.json();
    if (!path) return new Response(JSON.stringify({ error: 'path is required' }), { status: 400 });

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expires);
    if (error) {
      console.error('createSignedUrl error', error);
      return new Response(JSON.stringify({ error: error.message || String(error) }), { status: 500 });
    }

    return new Response(JSON.stringify({ signedUrl: data.signedUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Function error', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
