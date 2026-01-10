send-verification (Dashboard entrypoint)

This copy of the function is placed where the Supabase CLI expects it: `supabase/functions/send-verification/index.ts`.

If you previously tried `npx supabase functions deploy send-verification` and saw "Entrypoint path does not exist", it's because the CLI looks for the function under `supabase/functions`, not `functions/` at the repo root.

Deployment tips
- Ensure Docker is running locally: `sudo systemctl start docker` (or start Docker Desktop on your platform).
- If you prefer CI, add `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` as GitHub secrets and use the provided workflow.

Testing
- After deploy, set runtime env vars in the dashboard and test with the `Invoke` panel or CLI: `npx supabase functions invoke send-verification --project-ref <PROJECT_REF> --body '{"userId":"<id>","type":"email","contact":"you@example.com"}'`