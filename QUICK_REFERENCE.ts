// QUICK REFERENCE GUIDE
// Production Security Implementation

/**
 * ============================================================================
 * 1. ENVIRONMENT VARIABLES (.env.local / .env.production)
 * ============================================================================
 */

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key
VITE_PUBLIC_APP_URL=https://yourapp.com
NEXT_PUBLIC_APP_URL=https://yourapp.com
QR_TOKEN_SECRET=<generate with: openssl rand -base64 32>
KV_REST_API_URL=https://your-kv.upstash.io
KV_REST_API_TOKEN=your-token

/**
 * ============================================================================
 * 2. DATABASE QUOTA LIMITS (EDITABLE VIA SQL)
 * ============================================================================
 */

-- View current limits:
SELECT * FROM quota_limits;

-- Update limits (no code changes needed):
UPDATE quota_limits SET limit_per_day = 10 WHERE action = 'create_event';
UPDATE quota_limits SET limit_per_day = 500 WHERE action = 'register_event';
UPDATE quota_limits SET limit_per_day = 50 WHERE action = 'verification_request';

/**
 * ============================================================================
 * 3. API ENDPOINTS QUICK REFERENCE
 * ============================================================================
 */

// CREATE EVENT
POST /api/events/create
Authorization: Bearer {jwt}
{
  "title": "Event Name",
  "description": "...",
  "location": "City, State",
  "city": "City",
  "start_at": "2026-06-15T09:00:00Z",
  "end_at": "2026-06-15T17:00:00Z",
  "registration_deadline": "2026-06-01T00:00:00Z",
  "capacity": 500,
  "roles": [{ "name": "Attendee", "capacity": 400 }]
}
Response: 201 { event_id, message, warning? }
Errors: 429 quota_exceeded | 409 duplicate_detected

// REGISTER FOR EVENT
POST /api/events/register
Authorization: Bearer {jwt} [optional for guests]
{
  "event_id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-0123",
  "role": "Attendee"
}
Response: 201 { registration_id, status }
Errors: 429 quota_exceeded | 409 already_registered | 410 registration_closed

// CREATE/UPDATE PROFILE
POST /api/profile/create
Authorization: Bearer {jwt}
{
  "full_name": "John Doe",
  "handle": "johndoe",
  "bio": "Bio text",
  "phone": "+1-555-0123",
  "date_of_birth": "1990-01-15",
  "company": "Company Name",
  "job_title": "Title"
}
Response: 200 { user_id, message, handle }
Errors: 409 handle_taken

// REQUEST VERIFICATION TOKEN
POST /api/profile/verify
Authorization: Bearer {jwt}
{
  "type": "email|phone",
  "contact": "email@example.com|+1-555-0123"
}
Response: 201 { verification_id, message, expires_in_seconds: 600 }
Errors: 429 quota_exceeded | 409 verification_pending

// VERIFY TOKEN (Step 2)
POST /api/profile/verify
Authorization: Bearer {jwt}
{
  "type": "email|phone",
  "contact": "email@example.com",
  "token": "verification_code_or_token",
  "verify": true
}
Response: 200 { verified: true, message, contact }
Errors: 410 token_expired | 404 invalid_token

// GENERATE QR CODE
POST /api/qr/generate
Authorization: Bearer {jwt} [optional]
{
  "registration_id": "uuid",
  "expires_in_hours": 24
}
Response: 200 { qr_token, qr_data, expires_at, message }
Errors: 429 quota_exceeded | 403 unauthorized | 404 registration_not_found

// VERIFY QR CODE & CHECK IN
POST /api/qr/verify
{
  "qr_token": "base64.signature"
}
Response: 200 { checked_in: true, registration_id, event_id, attendee_name }
Errors: 409 already_checked_in | 401 invalid_token

/**
 * ============================================================================
 * 4. RATE LIMITS (PER IP ADDRESS)
 * ============================================================================
 */

/api/auth/*                    3 requests / hour
/api/profile/verify            3 requests / hour
/api/events/create             5 requests / hour
/api/events/register          200 requests / hour
/api/qr/*                    1000 requests / min
/api/* (general)              500 requests / min

// Response headers on rate limit:
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1707024000
Retry-After: 60

/**
 * ============================================================================
 * 5. QUOTA LIMITS (PER USER PER DAY)
 * ============================================================================
 */

create_event              5 per day (enforced by trigger)
register_event          200 per day (enforced by trigger)
verification_request     20 per day (enforced by trigger)
qr_fetch              10000 per day (enforced by trigger)

// Check a user's quota usage:
SELECT action, count FROM usage_quotas
WHERE user_id = 'user-uuid' AND date = CURRENT_DATE;

/**
 * ============================================================================
 * 6. EVENT SIMILARITY DETECTION
 * ============================================================================
 */

// In TypeScript:
import { performComprehensibilitySimilarityCheck } from '@/lib/eventSimilarityService';

const result = await performComprehensibilitySimilarityCheck(
  'Event Title',
  'San Francisco, CA',
  '2026-06-15T09:00:00Z',
  'organizer-uuid'
);

// Returns:
{
  hasDuplicates: boolean,
  assessment: 'clear' | 'low_risk' | 'warn' | 'block',
  phase1Results: [
    {
      similar_event_id: 'uuid',
      similar_event_title: 'Similar Event Title',
      phase1_score: 0.92,  // 0-1, higher = more similar
      final_assessment: 'WARN - High Similarity'
    }
  ]
}

// Assessment meanings:
'clear'     - No similar events found
'low_risk'  - Some similar events but low match
'warn'      - High similarity (80%+), review recommended
'block'     - Very high similarity (90%+), creation blocked

/**
 * ============================================================================
 * 7. QR TOKEN UTILITIES
 * ============================================================================
 */

// Generate token:
import { generateQRToken, generateCheckInURL } from '@/lib/qrTokenService';

const token = generateQRToken(registrationId, 24); // 24 hours expiry
const url = generateCheckInURL(token);
// url = https://yourapp.com/check-in/{token}

// Verify token:
import { verifyQRToken } from '@/lib/qrTokenService';

const payload = verifyQRToken(token);
if (payload) {
  console.log(payload.registration_id);
  console.log(new Date(payload.expires_at));
} else {
  console.log('Invalid or expired token');
}

// Generate full metadata:
import { generateQRMetadata } from '@/lib/qrTokenService';

const metadata = await generateQRMetadata(
  registrationId,
  24,              // expires in 24 hours
  eventId,         // optional
  true             // generate QR code image
);
// Returns: { token, url, registration_id, expires_at, created_at, qr_data_url? }

// Handle scan on client:
import { handleQRScan } from '@/lib/qrTokenService';

const scanResult = await handleQRScan(scannedData);
if (scanResult.success) {
  // Call /api/qr/verify with scanResult.token
} else {
  console.log(scanResult.error);
}

/**
 * ============================================================================
 * 8. TROUBLESHOOTING
 * ============================================================================
 */

// Problem: "Quota exceeded" immediately
SELECT * FROM quota_limits;  // Verify limits exist
SELECT * FROM usage_quotas WHERE date = CURRENT_DATE;  // Check usage

// Problem: Rate limiting not working
// 1. Verify middleware.ts deployed
// 2. Check KV_REST_API_URL and KV_REST_API_TOKEN set
// 3. Check Vercel logs: npx vercel logs

// Problem: Duplicate detection not working
SELECT proname FROM pg_proc WHERE proname LIKE '%similar%';  // Check functions exist
SELECT * FROM detect_duplicate_events('Title', 'Location', now()::timestamptz, 'uuid'::uuid);  // Test

// Problem: QR tokens don't verify
// 1. Verify QR_TOKEN_SECRET environment variable is set
// 2. Check secret is same across all instances
// 3. Test locally first

// Problem: Permission denied
// Check RLS policies on usage_quotas table:
SELECT * FROM pg_policies WHERE tablename = 'usage_quotas';

/**
 * ============================================================================
 * 9. MIGRATION EXECUTION ORDER
 * ============================================================================
 */

// 1. Run schema hardening (MUST BE FIRST)
// File: supabase/migrations/20260114_schema_hardening_constraints.sql
// Time: ~1 minute
// Creates: constraints, foreign keys, indexes

// 2. Run usage quotas (depends on step 1)
// File: supabase/migrations/20260114_usage_quotas_and_rate_limits.sql
// Time: ~2 minutes
// Creates: tables, functions, triggers

// 3. Run event similarity (independent)
// File: supabase/migrations/20260114_event_similarity_detection.sql
// Time: ~1 minute
// Creates: similarity detection tables and functions

/**
 * ============================================================================
 * 10. DEPLOYMENT CHECKLIST
 * ============================================================================
 */

Preparation:
  [ ] Backup database
  [ ] Test in staging
  [ ] Generate QR_TOKEN_SECRET
  [ ] Configure all env vars

Database:
  [ ] Run migration 1 (schema hardening)
  [ ] Run migration 2 (quotas)
  [ ] Run migration 3 (similarity)
  [ ] Verify all functions created

Application:
  [ ] Deploy api/ routes
  [ ] Deploy middleware.ts
  [ ] Deploy src/lib/* utilities
  [ ] Build and test: npm run build

Testing:
  [ ] Test each endpoint
  [ ] Verify quota enforcement
  [ ] Test rate limiting
  [ ] Test duplicate detection
  [ ] Test QR flow

Monitoring:
  [ ] Monitor error logs
  [ ] Check API response times
  [ ] Monitor rate limit hit rate
  [ ] Verify quota enforcement working

Post-Deployment:
  [ ] Keep monitoring for 24 hours
  [ ] Collect metrics
  [ ] Document any issues
  [ ] Prepare for iteration

/**
 * ============================================================================
 * 11. FILE LOCATIONS
 * ============================================================================
 */

Database Migrations:
  supabase/migrations/20260114_schema_hardening_constraints.sql
  supabase/migrations/20260114_usage_quotas_and_rate_limits.sql
  supabase/migrations/20260114_event_similarity_detection.sql

API Routes:
  api/events/create.ts
  api/events/register.ts
  api/profile/create.ts
  api/profile/verify.ts
  api/qr/generate.ts
  api/qr/verify.ts

Utilities:
  src/lib/eventSimilarityService.ts
  src/lib/qrTokenService.ts

Middleware:
  middleware.ts

Documentation:
  DEPLOYMENT_GUIDE.md
  SECURITY_IMPLEMENTATION.md
  IMPLEMENTATION_SUMMARY.md
  QUICK_REFERENCE.ts (this file)

/**
 * ============================================================================
 * 12. EXAMPLE: COMPLETE EVENT CREATION FLOW
 * ============================================================================
 */

// Step 1: Authenticate
const token = await supabase.auth.getSession().then(s => s.data.session?.access_token);

// Step 2: Check similarity (optional, but recommended)
import { performComprehensibilitySimilarityCheck } from '@/lib/eventSimilarityService';
const similarity = await performComprehensibilitySimilarityCheck(
  'My Event',
  'San Francisco, CA',
  '2026-06-15T09:00:00Z',
  userId
);
if (similarity.assessment === 'block') {
  console.log('Event blocked - too similar to existing event');
  return;
}

// Step 3: Create event
const response = await fetch('/api/events/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'My Event',
    description: 'Description',
    location: 'San Francisco, CA',
    city: 'San Francisco',
    start_at: '2026-06-15T09:00:00Z',
    end_at: '2026-06-15T17:00:00Z'
  })
});

if (response.status === 429) {
  console.log('Quota exceeded - too many events created today');
  return;
}

if (response.status === 409) {
  console.log('Duplicate event detected');
  return;
}

const { event_id } = await response.json();
console.log('Event created:', event_id);

/**
 * ============================================================================
 * 13. EXAMPLE: COMPLETE QR CHECK-IN FLOW
 * ============================================================================
 */

// Step 1: Generate QR for registration
const qrResponse = await fetch('/api/qr/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    registration_id: 'uuid',
    expires_in_hours: 24
  })
});

const { qr_token, qr_data } = await qrResponse.json();

// Step 2: Display QR (qr_data is scannable URL)
console.log(`Scan this: ${qr_data}`);

// Step 3: On check-in, scan code or paste token
const checkInResponse = await fetch('/api/qr/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ qr_token })
});

if (checkInResponse.status === 200) {
  const { attendee_name } = await checkInResponse.json();
  console.log(`Welcome, ${attendee_name}!`);
} else {
  console.log('Check-in failed');
}

export {};
