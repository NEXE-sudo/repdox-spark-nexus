# Production Security Implementation Guide

Complete reference for all security enhancements implemented.

## Table of Contents

1. [Database Changes](#database-changes)
2. [API Routes](#api-routes)
3. [Rate Limiting](#rate-limiting)
4. [Event Similarity Detection](#event-similarity-detection)
5. [QR Code Security](#qr-code-security)
6. [Environment Configuration](#environment-configuration)
7. [Deployment Checklist](#deployment-checklist)
8. [Troubleshooting](#troubleshooting)

---

## Database Changes

### Unique Constraints Added

#### `user_profiles`

```sql
UNIQUE(user_id)              -- One profile per user
UNIQUE(handle)               -- Handles must be unique (like usernames)
```

#### `profile_verifications`

```sql
UNIQUE(user_id, type)        -- One pending verification per user/type
```

#### `events`

```sql
UNIQUE(slug)                 -- Event slugs must be unique for URLs
```

#### `event_registrations`

```sql
UNIQUE(event_id, user_id) WHERE user_id IS NOT NULL   -- Authenticated users can't register twice
UNIQUE(event_id, lower(email)) WHERE user_id IS NULL  -- Guest emails must be unique per event
```

### Column Renames

- `user_profiles."Date of Birth"` → `user_profiles.date_of_birth` (PostgreSQL best practices)

### New Tables

#### `usage_quotas`

Tracks API usage for quota enforcement:

```sql
CREATE TABLE usage_quotas (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  ip text,
  action text NOT NULL,
  date date NOT NULL,
  count int DEFAULT 1,
  UNIQUE(user_id, action, date),
  UNIQUE(ip, action, date)
);
```

#### `quota_limits` (Lookup Table)

Defines daily limits:

```
action              | limit_per_day
--------------------|---------------
create_event        | 5
register_event      | 200
verification_request| 20
qr_fetch            | 10000
```

#### `event_similarity_checks`

Logs duplicate detection results:

```sql
CREATE TABLE event_similarity_checks (
  id uuid PRIMARY KEY,
  checking_event_id uuid,
  similar_event_id uuid,
  title_similarity_score float,
  action text,  -- 'block', 'warn', 'allowed'
  reason text
);
```

### New RPC Functions

#### `check_and_increment_quota()`

Atomically increments quota and returns allowed/remaining counts:

```sql
SELECT * FROM check_and_increment_quota(
  p_user_id := 'uuid',
  p_action := 'create_event'
);
-- Returns: { allowed: boolean, current_count: int, limit_per_day: int }
```

#### `detect_duplicate_events()`

Orchestrates event similarity detection:

```sql
SELECT * FROM detect_duplicate_events(
  p_title := 'Event Title',
  p_location := 'City, State',
  p_start_at := now()::timestamptz,
  p_organizer_id := 'uuid'
);
```

#### `normalize_event_title()`

Normalizes titles for comparison:

```sql
SELECT normalize_event_title('  Event Title!!! ')
-- Returns: 'event title'
```

### Triggers Added

1. **`trigger_enforce_create_event_quota`** - Enforces 5 events/day/user
2. **`trigger_enforce_register_event_quota`** - Enforces 200 registrations/day/user
3. **`trigger_enforce_verification_quota`** - Enforces 20 verification requests/day/user

---

## API Routes

All routes use Vercel serverless functions. Located in `/api` directory.

### POST `/api/events/create`

Creates a new event with duplicate detection.

**Request:**

```json
{
  "title": "Summer Conference 2026",
  "description": "Annual tech conference",
  "location": "San Francisco, CA",
  "city": "San Francisco",
  "start_at": "2026-06-15T09:00:00Z",
  "end_at": "2026-06-15T17:00:00Z",
  "registration_deadline": "2026-06-01T00:00:00Z",
  "capacity": 500,
  "roles": [
    { "name": "Attendee", "capacity": 400 },
    { "name": "Speaker", "capacity": 50 }
  ]
}
```

**Headers:**

```
Authorization: Bearer {jwt_token}
```

**Success Response (201):**

```json
{
  "event_id": "uuid",
  "message": "Event created successfully",
  "warning": null
}
```

**Error Responses:**

429 Quota Exceeded:

```json
{
  "error": "Quota exceeded: 5 / 5 daily limit",
  "code": "quota_exceeded"
}
```

409 Duplicate Detected:

```json
{
  "error": "Event blocked: Too similar to existing event",
  "code": "duplicate_detected",
  "similar_event": { "id": "uuid", "title": "Similar Event" }
}
```

**Security Features:**

- ✓ Verifies JWT auth token
- ✓ Extracts client IP from headers
- ✓ Enforces 5 events per day quota
- ✓ Checks for duplicate events
- ✓ Prevents organizer ID spoofing (extracted from token)

---

### POST `/api/events/register`

Registers user or guest for event.

**Request:**

```json
{
  "event_id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-0123",
  "role": "Attendee"
}
```

**Headers (Optional for Guests):**

```
Authorization: Bearer {jwt_token}
```

**Success Response (201):**

```json
{
  "registration_id": "uuid",
  "status": "registered",
  "message": "Successfully registered for event",
  "registered_as": "authenticated"
}
```

**Error Responses:**

409 Already Registered:

```json
{
  "error": "You are already registered for this event",
  "code": "already_registered"
}
```

429 Quota Exceeded:

```json
{
  "error": "Quota exceeded: 200 / 200 daily limit",
  "code": "quota_exceeded"
}
```

410 Registration Closed:

```json
{
  "error": "Registration deadline has passed",
  "code": "registration_closed"
}
```

**Security Features:**

- ✓ Prevents duplicate registrations (per user+event)
- ✓ Enforces 200 registrations per day quota
- ✓ Validates registration deadline
- ✓ Checks role capacity
- ✓ Atomic operation via RPC

---

### POST `/api/profile/create`

Creates or updates user profile.

**Request:**

```json
{
  "full_name": "John Doe",
  "handle": "johndoe",
  "bio": "Software engineer",
  "phone": "+1-555-0123",
  "website": "https://johndoe.com",
  "company": "Tech Corp",
  "job_title": "Senior Engineer",
  "date_of_birth": "1990-01-15",
  "linkedin_url": "https://linkedin.com/in/johndoe",
  "github_url": "https://github.com/johndoe"
}
```

**Headers:**

```
Authorization: Bearer {jwt_token}
```

**Success Response (200):**

```json
{
  "user_id": "uuid",
  "message": "Profile created/updated successfully",
  "handle": "johndoe"
}
```

**Error Responses:**

409 Handle Taken:

```json
{
  "error": "Handle is already taken",
  "code": "handle_taken"
}
```

**Security Features:**

- ✓ Enforces handle uniqueness
- ✓ Only allows users to edit their own profile
- ✓ Validates constraint violations

---

### POST `/api/profile/verify`

**Step 1: Request Verification Token**

**Request:**

```json
{
  "type": "email",
  "contact": "user@example.com"
}
```

**Headers:**

```
Authorization: Bearer {jwt_token}
```

**Success Response (201):**

```json
{
  "verification_id": "uuid",
  "message": "Verification token sent to email",
  "contact": "user@example.com",
  "expires_in_seconds": 600
}
```

**Step 2: Verify Token**

**Request:**

```json
{
  "type": "email",
  "contact": "user@example.com",
  "token": "verification_code",
  "verify": true
}
```

**Success Response (200):**

```json
{
  "verified": true,
  "message": "Email successfully verified",
  "contact": "user@example.com"
}
```

**Error Responses:**

429 Quota Exceeded:

```json
{
  "error": "Quota exceeded: 20 / 20 daily limit",
  "code": "quota_exceeded"
}
```

410 Token Expired:

```json
{
  "error": "Verification token has expired",
  "code": "token_expired"
}
```

404 Invalid Token:

```json
{
  "error": "Verification token not found or already verified",
  "code": "invalid_token"
}
```

**Security Features:**

- ✓ Enforces 20 requests per day quota
- ✓ Validates token expiry (10 minutes)
- ✓ Prevents duplicate verification requests
- ✓ Marks email as confirmed in auth.users

---

### POST `/api/qr/generate`

Generates a tokenized QR code for event check-in.

**Request:**

```json
{
  "registration_id": "uuid",
  "expires_in_hours": 24
}
```

**Headers (Optional):**

```
Authorization: Bearer {jwt_token}
```

**Success Response (200):**

```json
{
  "qr_token": "eyJyZWdpc3RyYXRpb25faWQiOiJ1dWlkIn0.signature",
  "qr_data": "https://yourapp.com/check-in/eyJyZWdpc3RyYXRpb25fahid0.signature",
  "expires_at": "2026-02-04T12:00:00Z",
  "message": "QR token generated successfully"
}
```

**Error Responses:**

429 Quota Exceeded:

```json
{
  "error": "Quota exceeded: 10000 / 10000 daily limit",
  "code": "quota_exceeded"
}
```

403 Not Authorized:

```json
{
  "error": "Not authorized to generate QR for this registration",
  "code": "unauthorized"
}
```

**Security Features:**

- ✓ Tokenizes registration ID (not exposed in QR)
- ✓ Includes HMAC signature for tamper detection
- ✓ Includes expiry timestamp
- ✓ Caches response for 1 hour
- ✓ Only organizer or registrant can access

---

### POST `/api/qr/verify`

Verifies QR token and marks attendee as checked in.

**Request:**

```json
{
  "qr_token": "eyJyZWdpc3RyYXRpb25faWQiOiJ1dWlkIn0.signature"
}
```

**Success Response (200):**

```json
{
  "checked_in": true,
  "registration_id": "uuid",
  "event_id": "uuid",
  "attendee_name": "John Doe",
  "attendee_email": "john@example.com",
  "message": "John Doe checked in successfully"
}
```

**Error Responses:**

409 Already Checked In:

```json
{
  "error": "Already checked in",
  "code": "already_checked_in"
}
```

401 Invalid Token:

```json
{
  "error": "Invalid or expired QR token",
  "code": "invalid_token"
}
```

**Security Features:**

- ✓ Validates token signature
- ✓ Checks expiry timestamp
- ✓ Prevents token reuse
- ✓ Rate limited by Edge Middleware (1000/min/IP)

---

## Rate Limiting

### Vercel Edge Middleware

Located in `/middleware.ts`. Applied globally to all `/api/*` routes.

**Limits per IP Address:**

| Endpoint               | Limit | Window   |
| ---------------------- | ----- | -------- |
| `/api/auth/*`          | 3     | 1 hour   |
| `/api/profile/verify`  | 3     | 1 hour   |
| `/api/events/create`   | 5     | 1 hour   |
| `/api/events/register` | 200   | 1 hour   |
| `/api/qr/*`            | 1000  | 1 minute |
| `/api/*` (general)     | 500   | 1 minute |

**Response Headers on Rate Limit:**

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1707024000
Retry-After: 60
```

**429 Response Body:**

```json
{
  "error": "Too many requests",
  "code": "rate_limit_exceeded",
  "retry_after": 60,
  "limit": 5,
  "remaining": 0
}
```

**Implementation:**

- Uses Vercel KV (Redis) for distributed rate limiting
- Sliding window algorithm (allows bursts, limits sustained abuse)
- Per-IP tracking across all edge regions
- Automatic cleanup of expired records

**Configuration:**

```env
KV_REST_API_URL=https://your-kv.upstash.io
KV_REST_API_TOKEN=your-token
```

**Development (In-Memory):**
For local development without KV, uses simple in-memory rate limiter.

---

## Event Similarity Detection

### Phase 1: String-Based Detection

**How It Works:**

1. Normalize both titles (lowercase, remove punctuation)
2. Calculate Levenshtein distance
3. Convert to similarity score (0-1)
4. Flag if:
   - Same organizer
   - Same location
   - Same date (±1 day)
   - Similarity > 0.8

**Example:**

```typescript
import { performComprehensibilitySimilarityCheck } from '@/lib/eventSimilarityService';

const result = await performComprehensibilitySimilarityCheck(
  title: 'Summer Conference 2026',
  location: 'San Francisco, CA',
  startAt: '2026-06-15T09:00:00Z',
  organizerId: 'user-uuid'
);

// Result:
{
  hasDuplicates: true,
  assessment: 'warn',
  phase1Results: [
    {
      similar_event_id: 'uuid',
      similar_event_title: 'Summer Conf 2026',
      phase1_score: 0.92,
      final_assessment: 'WARN - High Similarity'
    }
  ]
}
```

### Phase 2: Embedding-Based (Optional)

Requires pgvector extension. Provides semantic similarity using OpenAI embeddings.

**Not enabled by default.** To enable:

1. Install pgvector: `CREATE EXTENSION vector;`
2. Uncomment code in migration `20260114_event_similarity_detection.sql`
3. Generate embeddings using OpenAI API

---

## QR Code Security

### Token Structure

QR token format: `{base64_payload}.{hmac_signature}`

**Payload:**

```json
{
  "registration_id": "uuid",
  "event_id": "uuid",
  "created_at": 1707024000000,
  "expires_at": 1707110400000
}
```

**Signature:** HMAC-SHA256 of payload with secret key

### Token Verification

```typescript
import { verifyQRToken } from "@/lib/qrTokenService";

const payload = verifyQRToken(token);
// Returns: { registration_id, event_id, created_at, expires_at } or null
```

### Check-In Flow

1. User scans QR code → `https://app.com/check-in/{token}`
2. App extracts token from URL
3. Calls `POST /api/qr/verify` with token
4. API verifies signature and expiry
5. API updates registration status to `checked_in`
6. Subsequent scans fail with "already_checked_in"

### Caching

QR metadata cached for 1 hour:

```
Cache-Control: public, max-age=3600
```

---

## Environment Configuration

### Required Environment Variables

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key
SUPABASE_ANON_KEY=your-anon-key

# App Configuration
VITE_PUBLIC_APP_URL=https://yourapp.com
NEXT_PUBLIC_APP_URL=https://yourapp.com  # For API routes

# QR Token Encryption
QR_TOKEN_SECRET=random-32-char-string

# Rate Limiting (Vercel KV)
KV_REST_API_URL=https://your-kv.upstash.io
KV_REST_API_TOKEN=your-token

# Optional: Email/SMS Provider
SENDGRID_API_KEY=your-key
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
```

### Generating QR Token Secret

```bash
# macOS/Linux
QR_TOKEN_SECRET=$(openssl rand -base64 32)
echo $QR_TOKEN_SECRET

# Windows PowerShell
$QR_TOKEN_SECRET = [Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Minimum 0 -Maximum 256) }))
Write-Output $QR_TOKEN_SECRET
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Create database backup
- [ ] Test all migrations in staging
- [ ] Configure environment variables
- [ ] Set QR_TOKEN_SECRET
- [ ] Prepare rollback plan

### Database

- [ ] Run `20260114_schema_hardening_constraints.sql`
- [ ] Run `20260114_usage_quotas_and_rate_limits.sql`
- [ ] Run `20260114_event_similarity_detection.sql`
- [ ] Verify all functions created: `SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public';`

### Application

- [ ] Deploy API routes (`/api/*`)
- [ ] Deploy middleware (`middleware.ts`)
- [ ] Deploy utilities (`src/lib/*`)
- [ ] Build and test: `npm run build`

### Testing

- [ ] Test event creation (5 per hour limit)
- [ ] Test event registration (200 per hour limit)
- [ ] Test profile verification (20 per hour limit)
- [ ] Test QR generation and verification
- [ ] Test rate limiting (429 responses)
- [ ] Test duplicate detection
- [ ] Load test (ramp up to production traffic)

### Monitoring

- [ ] Monitor database performance
- [ ] Monitor API response times
- [ ] Monitor rate limit hit rate
- [ ] Monitor error logs
- [ ] Setup alerts for quota_exceeded

### Post-Deployment

- [ ] Verify all tests passing
- [ ] Monitor for 24 hours
- [ ] Collect metrics
- [ ] Document any issues
- [ ] Iterate on limits if needed

---

## Troubleshooting

### "Quota Exceeded" on First Request

**Cause:** Quota counter not resetting or incorrect function name

**Fix:**

```sql
-- Check quota_limits table
SELECT * FROM quota_limits;

-- Check current quota
SELECT * FROM usage_quotas
WHERE date = CURRENT_DATE
ORDER BY created_at DESC LIMIT 1;

-- Reset (if testing)
DELETE FROM usage_quotas WHERE date < CURRENT_DATE;
```

### Rate Limiting Not Working

**Cause:** Middleware not deployed or KV not configured

**Fix:**

1. Check middleware.ts deployed: `npx vercel env list`
2. Check KV configured: `npx vercel env pull`
3. Check logs: `npx vercel logs`

### Duplicate Detection Not Working

**Cause:** RPC functions not created or similarity check failing

**Fix:**

```sql
-- Check functions exist
SELECT COUNT(*) FROM pg_proc
WHERE proname IN ('detect_duplicate_events', 'check_event_similarity_phase1');

-- Test manually
SELECT * FROM detect_duplicate_events(
  'Test Event',
  'San Francisco, CA',
  now()::timestamptz,
  'user-uuid'::uuid
);
```

### QR Token Verification Failing

**Cause:** Secret key mismatch or signature validation error

**Fix:**

1. Verify QR_TOKEN_SECRET set: `echo $QR_TOKEN_SECRET`
2. Check secret is consistent across requests
3. Test locally: `npm run dev` and test QR generation

### Permission Denied Errors

**Cause:** Service role key incorrect or RLS policies blocking

**Fix:**

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'usage_quotas';

-- Temporarily disable RLS for testing (not production!)
ALTER TABLE usage_quotas DISABLE ROW LEVEL SECURITY;

-- Re-enable
ALTER TABLE usage_quotas ENABLE ROW LEVEL SECURITY;
```

---

## Support & References

- **Supabase Docs:** https://supabase.com/docs
- **PostgreSQL Triggers:** https://www.postgresql.org/docs/current/sql-createtrigger.html
- **Vercel KV:** https://vercel.com/docs/storage/vercel-kv
- **Levenshtein Distance:** https://en.wikipedia.org/wiki/Levenshtein_distance
- **JWT Tokens:** https://jwt.io

---

**Last Updated:** February 3, 2026
**Version:** 1.0
**Status:** Production Ready
