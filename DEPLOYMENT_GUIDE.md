/\*\*

- PRODUCTION DEPLOYMENT GUIDE
-
- Complete checklist and runbook for deploying the new security features.
- Execution time: ~2-3 hours for careful, staged rollout
-
- Phase 1: Database migrations (30 min)
- Phase 2: Environment configuration (20 min)
- Phase 3: API deployment (30 min)
- Phase 4: Testing & validation (60 min)
- Phase 5: Monitoring & rollback (ongoing)
  \*/

/\*\*

- PHASE 0: PRE-DEPLOYMENT PREPARATION
  \*/

/\*
0.1 BACKUP

- Create full database backup
  Command: pg_dump YOUR_DB > backup_pre_security.sql
- Export Supabase project settings
- Document current rate limiting configuration (if any)

  0.2 COMMUNICATION

- Notify users about brief maintenance (if required)
- Prepare rollback documentation
- Set up monitoring alerts

  0.3 STAGING TEST

- Deploy to staging environment first
- Test all new API endpoints
- Run load tests on rate limiting
- Verify database triggers work correctly
- Test error responses
  \*/

/\*\*

- PHASE 1: DATABASE MIGRATIONS
  \*/

/\*
1.1 RUN SCHEMA HARDENING MIGRATION
File: supabase/migrations/20260114_schema_hardening_constraints.sql

Steps:

1. Connect to Supabase database:
   npx supabase db pull # Pull current schema

2. Apply migration:
   npx supabase migration up

   OR manually in Supabase Studio:
   - Go to SQL Editor
   - Paste contents of migration file
   - Execute with "Execute" button

Expected: Schema hardening completes in <1 minute
Rollback: If constraints cause conflicts, manually drop added constraints

Constraints added:

- unique_user_profiles_user_id
- unique_user_profiles_handle
- unique_profile_verifications_user_type
- unique_events_slug
- idx_event_registrations_user_unique (partial index)
- idx_event_registrations_email_unique (partial index)

⚠️ WARNING: If existing data violates constraints:

- Check for duplicate handles:
  SELECT handle, COUNT(_) FROM user_profiles
  WHERE handle IS NOT NULL GROUP BY handle HAVING COUNT(_) > 1;
- Resolve duplicates manually or via migration script
- Then re-run migration
  \*/

/\*
1.2 RUN USAGE QUOTAS MIGRATION
File: supabase/migrations/20260114_usage_quotas_and_rate_limits.sql

Steps:

1. Apply migration same way as 1.1

Expected: Completes in <2 minutes
Creates:

- usage_quotas table
- quota_limits lookup table
- check_and_increment_quota() RPC function
- Trigger functions for enforcement

Verify:
SELECT _ FROM quota_limits; -- Should show 5 actions
SELECT _ FROM usage_quotas LIMIT 10; -- Should be empty initially

Triggers created:

- trigger_enforce_create_event_quota (events table)
- trigger_enforce_register_event_quota (event_registrations table)
- trigger_enforce_verification_quota (profile_verifications table)
  \*/

/\*
1.3 RUN EVENT SIMILARITY MIGRATION
File: supabase/migrations/20260114_event_similarity_detection.sql

Steps:

1. Apply migration

Expected: Completes in <1 minute
Creates:

- event_similarity_checks table
- check_event_similarity_phase1() RPC function
- normalize_event_title() function
- detect_duplicate_events() orchestrator function

Verify:
SELECT \* FROM event_similarity_checks LIMIT 1; -- Should be empty

Notes:

- Phase 2 (pgvector) is optional and disabled by default
- Uncomment in migration if pgvector extension is available
- Phase 1 string-based matching is production-ready as-is
  \*/

/\*
1.4 VERIFY ALL MIGRATIONS

Checklist:
☐ All 3 migration files executed successfully
☐ No constraint violations reported
☐ Triggers are active
☐ RPC functions are callable
☐ Indexes created successfully
☐ RLS policies applied

Test RPC calls:
SELECT public.check_and_increment_quota(
p_user_id := 'test-uuid',
p_ip := '192.168.1.1',
p_action := 'create_event'
);

Should return: { allowed: true, current_count: 1, limit_per_day: 5 }
\*/

/\*\*

- PHASE 2: ENVIRONMENT CONFIGURATION
  \*/

/\*
2.1 SET ENVIRONMENT VARIABLES

Create/update .env.local and .env.production:

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key
NEXT_PUBLIC_APP_URL=https://yourapp.com

# Rate limiting (if using Vercel KV)

KV_REST_API_URL=https://your-kv-store.upstash.io
KV_REST_API_TOKEN=your-kv-token

# QR token encryption

QR_TOKEN_SECRET=$(openssl rand -base64 32) # Generate strong random key

⚠️ SECURITY: Store secrets in Vercel/environment, not in git
\*/

/\*
2.2 CONFIGURE QUOTA LIMITS (OPTIONAL)

Default limits (can be adjusted):

- create_event: 5 per day per user
- register_event: 200 per day per user
- verification_request: 20 per day per user
- qr_fetch: 10,000 per day per user

To customize, edit the INSERT statement in migration 1.2:

UPDATE quota_limits SET limit_per_day = 10
WHERE action = 'create_event';

Changes take effect immediately for new quota checks.
\*/

/\*
2.3 CONFIGURE RATE LIMITING

If using Vercel KV:

1. Create Upstash Redis instance
2. Get KV_REST_API_URL and KV_REST_API_TOKEN
3. Set environment variables (see 2.1)
4. Vercel Edge Middleware will use KV automatically

If in-memory only (single instance):

- Comment out KV code in middleware.ts
- Use rateLimitMemory() function instead
- Limits per edge location, not global

Rate limit defaults (Vercel Edge):

- /api/auth, /api/profile/verify: 3/hour/IP
- /api/events/create: 5/hour/IP
- /api/events/register: 200/hour/IP
- /api/qr/\*: 1000/min/IP
- General /api/_: 500/min/IP
  _/

/\*\*

- PHASE 3: API DEPLOYMENT
  \*/

/\*
3.1 DEPLOY API ROUTES

Files to deploy:

- api/events/create.ts
- api/events/register.ts
- api/profile/create.ts
- api/profile/verify.ts
- api/qr/generate.ts
- api/qr/verify.ts

Using Vercel:

1. Commit changes to git
2. Push to main/production branch
3. Vercel automatically detects /api directory
4. Builds and deploys to edge nodes
5. Monitor build logs

Command:
git add api/
git commit -m "feat: Add secure API routes with rate limiting and quota enforcement"
git push origin main

Expected deployment time: 3-5 minutes
\*/

/\*
3.2 DEPLOY MIDDLEWARE

File: middleware.ts

- Handles rate limiting for all /api/\* routes
- Uses Vercel Edge runtime
- Applies globally to all regions

Verify in Vercel Dashboard:

- Functions tab should show middleware deployment
- Check execution time (should be <50ms)
  \*/

/\*
3.3 DEPLOY UTILITY LIBRARIES

Files:

- src/lib/eventSimilarityService.ts
- src/lib/qrTokenService.ts

These are bundled with your app, no separate deployment needed.
Deployed with your main Vite build.
\*/

/\*\*

- PHASE 4: TESTING & VALIDATION
  \*/

/\*
4.1 SMOKE TESTS

Test each endpoint:

1. Create Event (with auth):
   POST /api/events/create
   Headers: Authorization: Bearer {token}
   Body: { title, description, location, start_at, end_at }
   Expected: 201 with event_id

2. Register Event:
   POST /api/events/register
   Headers: Authorization: Bearer {token}
   Body: { event_id, name, email }
   Expected: 201 with registration_id

3. Create Profile:
   POST /api/profile/create
   Headers: Authorization: Bearer {token}
   Body: { full_name, handle, bio }
   Expected: 200 with user_id

4. Request Verification:
   POST /api/profile/verify
   Headers: Authorization: Bearer {token}
   Body: { type: 'email', contact: 'user@example.com' }
   Expected: 201 with verification_id

5. Generate QR:
   POST /api/qr/generate
   Headers: Authorization: Bearer {token}
   Body: { registration_id }
   Expected: 200 with qr_token, qr_data, expires_at

6. Verify QR:
   POST /api/qr/verify
   Body: { qr_token }
   Expected: 200 with checked_in: true
   \*/

/\*
4.2 QUOTA ENFORCEMENT TESTS

Test quota limits:

1. Create event 6 times in same hour (as same user):
   - First 5: Success (201)
   - 6th: Failure (429) with error code 'quota_exceeded'

2. Register 201 times in same hour:
   - First 200: Success
   - 201st: Failure (429)

3. Request verification 21 times:
   - First 20: Success
   - 21st: Failure (429)

Verify quota records created:
SELECT _ FROM usage_quotas
WHERE date = CURRENT_DATE
ORDER BY created_at DESC LIMIT 10;
_/

/\*
4.3 RATE LIMITING TESTS

Test edge middleware rate limits:

1. Hit /api/events/create 6 times in 1 minute (from same IP):
   - First 5: Success
   - 6th: 429 Too Many Requests

2. Check response headers:
   X-RateLimit-Limit: 5
   X-RateLimit-Remaining: 0
   Retry-After: 60

3. Wait 60 seconds, retry:
   Should succeed (bucket reset)
   \*/

/\*
4.4 DUPLICATE EVENT DETECTION TESTS

1. Create event: "Summer Conference 2026"
2. Try to create: "Summer Conference 2026" (same title, same organizer, same location)
   Expected: 409 Conflict with warning

3. Create with slightly different title: "Summer Conf 2026"
   Expected: 201 but with warning (high similarity)

4. Create completely different: "Winter Retreat 2026"
   Expected: 201 with no warning
   \*/

/\*
4.5 QR TOKEN VERIFICATION TESTS

1. Generate QR token with 1 hour expiry
2. Verify immediately: Should succeed
3. Modify token (change 1 character): Should fail
4. Wait 1+ hours, try again: Should fail (expired)
5. Generate token, verify check-in twice: 2nd should fail with "already_checked_in"
   \*/

/\*\*

- PHASE 5: MONITORING & ROLLBACK
  \*/

/\*
5.1 MONITORING

Key metrics to watch:

1. Database:
   - Transaction latency (should be <100ms)
   - Trigger execution time
   - Quota check function calls
   - Constraint violations

   Query:
   SELECT
   COUNT(\*) as quota_checks,
   AVG(EXTRACT(EPOCH FROM (now() - created_at))) as avg_age_seconds
   FROM usage_quotas
   WHERE created_at > now() - interval '1 hour';

2. API:
   - 429 response count (should be <5% of traffic)
   - 409 duplicate event count
   - Check-in success rate
   - Error rates by endpoint

3. Edge Middleware:
   - Rate limit hit rate
   - Edge function execution time
   - Cache hit rate

Set up alerts:

- Quota_exceeded > 100 in 5 min
- API error rate > 5%
- Database slow queries (>1s)
  \*/

/\*
5.2 TROUBLESHOOTING

Problem: "Quota exceeded" immediately on first request
Fix: Check quota_limits table, verify action names match

Problem: Rate limiting not working
Fix: Verify middleware.ts is deployed, KV endpoint configured

Problem: Duplicate detection not working
Fix: Check similarity functions exist:
SELECT proname FROM pg_proc WHERE proname LIKE '%similar%';

Problem: QR tokens don't verify
Fix: Verify QR_TOKEN_SECRET environment variable is set, consistent across requests
\*/

/\*
5.3 ROLLBACK PROCEDURE

If critical issues arise:

1. Immediate (< 5 min):
   - Disable API routes: Return 503 from middleware
   - Revert middleware.ts (no rate limiting, no QR checks)
   - Keep database migrations (they're safe)

2. Database rollback (if constraint violations):
   SQL:
   ALTER TABLE public.user_profiles
   DROP CONSTRAINT IF EXISTS unique_user_profiles_handle;

   ALTER TABLE public.events
   DROP CONSTRAINT IF EXISTS unique_events_slug;

3. Complete rollback:
   - Restore from backup (see Phase 0)
   - Revert API routes
   - Revert middleware
   - Redeploy previous version

⚠️ WARNING: Full rollback loses any data inserted between deployment and rollback
\*/

/\*
5.4 METRICS COLLECTION

Queries to monitor:

1. Quota usage last 24 hours:
   SELECT action, COUNT(\*) as hits, AVG(count) as avg_count
   FROM usage_quotas
   WHERE date = CURRENT_DATE
   GROUP BY action
   ORDER BY hits DESC;

2. Rate limit violations:
   SELECT COUNT(\*) FROM usage_quotas
   WHERE count > (SELECT limit_per_day FROM quota_limits WHERE action = usage_quotas.action)
   AND date = CURRENT_DATE;

3. Duplicate events:
   SELECT COUNT(\*) FROM event_similarity_checks
   WHERE action = 'block' AND checked_at > now() - interval '24 hours';

4. Check-in success:
   SELECT
   COUNT(_) as total,
   SUM(CASE WHEN status = 'checked_in' THEN 1 ELSE 0 END) as checked_in,
   ROUND(100.0 _ SUM(CASE WHEN status = 'checked_in' THEN 1 ELSE 0 END) / COUNT(_), 2) as success_rate
   FROM event_registrations
   WHERE created_at > now() - interval '24 hours';
   _/

/\*\*

- PHASE 6: POST-DEPLOYMENT
  \*/

/\*
6.1 DOCUMENTATION UPDATES

- Update API documentation with new endpoints
- Document rate limit response codes
- Create runbooks for common issues
- Update developer guides
  \*/

/\*
6.2 USER COMMUNICATION

- Notify users about quota limits (if they use bulk operations)
- Explain duplicate event prevention
- Provide feedback on UX improvements
  \*/

/\*
6.3 PERFORMANCE OPTIMIZATION

Monitor and optimize:

- Add caching to event similarity checks
- Batch quota updates if traffic spikes
- Optimize indexes based on query patterns
- Consider read replicas for high-volume queries
  \*/

/\*\*

- SUMMARY
  \*/

/\*
Timeline:

- Phase 1 (DB): 30 minutes
- Phase 2 (Config): 20 minutes
- Phase 3 (Deploy): 10 minutes
- Phase 4 (Testing): 60 minutes
- Total: ~2 hours

Risk: LOW

- No breaking changes to existing APIs
- Migrations are backward compatible
- Triggers are non-blocking
- Quota enforcement only blocks abusive patterns

Benefits:

- Reduced spam/duplicate events
- Better event check-in security
- Fair resource allocation via quotas
- Prevention of abuse

Next steps:

1. Run migrations in staging
2. Configure environment variables
3. Deploy API routes
4. Run full test suite
5. Deploy to production
6. Monitor for 24 hours
7. Collect metrics and iterate
   \*/

export {};
