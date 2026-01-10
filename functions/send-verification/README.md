Send Verification Edge Function

Purpose
- Generate a verification token (email or phone), insert it into `profile_verifications`, and attempt delivery via SendGrid (email) or Twilio (SMS).

Env vars to set in Supabase project (Functions > Settings > Environment Variables)
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (required for server insert)
- SENDGRID_API_KEY (optional, for email delivery)
- SENDGRID_FROM (email address)
- TWILIO_ACCOUNT_SID (optional, for SMS)
- TWILIO_AUTH_TOKEN
- TWILIO_FROM

Deploy
1. supabase functions deploy send-verification
2. supabase functions list (to verify)

Test
- curl -X POST <FUNCTION_URL> -d '{"userId":"<auth_user_id>","type":"email","contact":"you@example.com"}' -H 'Content-Type: application/json' 

Responses and errors
- Success: { ok: true, sent: true|false }
- 400: missing/invalid arguments
- 404: { error: 'user_not_found' } (the provided `userId` does not exist in `auth.users`)
- 429: rate limit - try again later
- 500: { error: 'service_role_key_missing' } or { error: 'insert_failed', detail: '...' } or { error: 'internal_error', detail: '...' }

Notes
- The function enforces a simple rate limit: prevents repeated requests within 60 seconds for the same user+type+contact.
- The function writes the token to `profile_verifications` (DB) so the client can still verify by calling `verifyToken`.
- In development you can read the token from the DB or logs; in production the token is sent via provider and should not be returned to clients.