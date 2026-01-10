Edge Functions & Server-side helpers

Overview
This document covers the recommended Edge Functions to move client-sensitive or heavy-lifting logic off the browser and into server-side functions deployed to Supabase.

send-verification
- Purpose: Generate & deliver verification tokens for email/phone.
- Deploy (manual): `npx supabase functions deploy send-verification --project-ref <PROJECT_REF>` (ensure Docker is running locally; the CLI builds functions using Docker)
- Deploy (CI): see `.github/workflows/deploy-send-verification.yml` — configure `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` as GitHub Secrets
- Env (runtime for the function in Supabase): `SUPABASE_SERVICE_ROLE_KEY` (set in the function's environment settings), `SENDGRID_API_KEY`, `SENDGRID_FROM`, or `TWILIO_*`
- Notes: Function writes to `profile_verifications`. It also does a simple rate-limit check.

register_for_event
- Purpose: Atomic RPC that checks registration deadlines, role capacities, prevents duplicate user registrations, and inserts a registration in a single transaction.
- Migration: `db/migrations/20260110_register_for_event.sql` adds the PL/pgSQL function `register_for_event`.
- Client: `src/lib/eventService.ts` exposes `registerForEvent(...)`; `src/pages/EventDetail.tsx` now calls the RPC to submit registrations.
- Notes: Uses an advisory lock to serialize attempts per event and raises clear errors: `event_not_found`, `registration_closed`, `role_full`, `already_registered`. Callers should surface these messages to users.

xlsx-export
- Purpose: Generate XLSX on server and avoid shipping heavy `xlsx` lib to clients.
- Implementation: Edge Function `export-registrations-xlsx` that pulls registrations for an event, builds an XLSX (SheetJS), uploads it to a Storage bucket (by default `exports`) and returns a signed URL. If upload fails the function falls back to returning a base64 payload. See `functions/export-registrations-xlsx` for details and deploy instructions.
- Auth: callers must present a valid user `Authorization` header; the function verifies the caller is the event owner or listed in the event `organisers` JSON before producing the export.
- Env (runtime): `SUPABASE_SERVICE_ROLE_KEY` (preferred), `SUPABASE_URL`, `EXPORTS_BUCKET` (optional), `EXPORTS_SIGNED_URL_EXPIRES` (optional). Note: some CLI secret stores disallow env names starting with `SUPABASE_` — you can instead set `SERVICE_ROLE_KEY` and the functions will accept either.

Security notes
- Use SUPABASE_SERVICE_ROLE_KEY with care (only in server functions). Keep it in function env, never in client.
- Add rate-limiting/monitoring to functions that trigger external provider usage.

Observability
- Log important events and failures (consistently) and set up an error reporter for function logs.

If you want, I can scaffold `register_for_event` (RPC + client changes) next — shall I proceed with that?