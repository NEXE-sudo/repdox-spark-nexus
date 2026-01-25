Export Registrations XLSX Edge Function

This function generates an .xlsx file containing registrations for an event and returns a base64-encoded file in the response JSON.

Usage (Invoke):
- POST body: { "eventId": "<UUID>" }
- Response: { ok: true, filename: "registrations-<id>.xlsx", data: "<base64>" }
- Example (CLI):
  npx supabase functions invoke export-registrations-xlsx --project-ref <PROJECT_REF> --body '{"eventId":"<EVENT_UUID>"}'

Deploy:
- Manual: `npx supabase functions deploy export-registrations-xlsx --project-ref <PROJECT_REF>`
- CI: add path `functions/export-registrations-xlsx/**` to workflow and deploy with `SUPABASE_ACCESS_TOKEN` & `SUPABASE_PROJECT_REF`.

Env (runtime): `SUPABASE_SERVICE_ROLE_KEY` (preferred), `SUPABASE_URL`. If your secrets provider disallows env names starting with `SUPABASE_`, you can instead set `SERVICE_ROLE_KEY` (the function will accept either).

Notes:
- The function uses the service role key to read `event_registrations` and `events` and to upload the generated XLSX to Storage.
- By default it uploads to the bucket named by `EXPORTS_BUCKET` (default: `exports`) and returns a signed URL; if upload fails it falls back to returning a base64 payload.
- Ensure the `EXPORTS_BUCKET` exists in your Supabase project before calling this function.
