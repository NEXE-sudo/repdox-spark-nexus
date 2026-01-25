# send-message Edge Function

Purpose: upload message attachments to `messages` storage bucket, then call `app.send_message` RPC to store the encrypted message.

Environment variables required:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (service role key) — function runs in Deno so env is read via Deno.env

Notes:
- This function uses a Deno-compatible supabase client import so it can be bundled for Edge deployment.
- Ensure you have an active encryption key in the DB (use `scripts/set_db_encryption_key.ts` to insert and activate a key via the new `app.set_encryption_key` RPC).

Usage (curl example):

curl -X POST \
  -H "Authorization: Bearer <service-key>" \
  -F "conversation_id=<conversation-uuid>" \
  -F "sender_id=<user-uuid>" \
  -F "plaintext=Hi there" \
  -F "file=@/path/to/image.png" \
  https://<your-supabase-edge-url>/functions/v1/send-message

Notes:
- The function uploads files to a private `messages` bucket and stores attachment paths in message metadata.
- The DB RPC encrypts the message server-side (using `app.send_message`).
