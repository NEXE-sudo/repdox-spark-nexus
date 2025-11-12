Supabase Function: get-signed-url

This Edge Function accepts POST requests with JSON { path, bucket?, expires? } and returns a signedUrl for the given storage object.

Environment variables required (set in Supabase Functions settings):
- SUPABASE_URL (or VITE_SUPABASE_URL)
- SUPABASE_SERVICE_ROLE_KEY

Deploy:

1. Install Supabase CLI and login.
2. From the repo root, run:

```bash
supabase functions deploy get-signed-url --project-ref your-project-ref
```

3. In Supabase Dashboard → Functions → get-signed-url → Settings, add the `SUPABASE_SERVICE_ROLE_KEY` (your project's service_role key) and `SUPABASE_URL`.

4. After deploy, set the public frontend env variable `VITE_SUPABASE_FUNCTIONS_URL` to the function base URL (e.g. https://<project>.functions.supabase.co).

Usage (client): POST to `${functionsUrl}/get-signed-url` with JSON { path: 'events/file.jpg', bucket: 'events', expires: 3600 }.
