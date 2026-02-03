# MIGRATION DEPLOYMENT CHECKLIST

## Pre-Migration

### Environment Preparation

- [ ] Staging environment available (separate Supabase project)
- [ ] Production database backed up (`pg_dump`)
- [ ] Backup stored securely (verify 1 copy minimum)
- [ ] Maintenance window scheduled (lowest traffic time)
- [ ] Team notified of planned maintenance
- [ ] Runbook printed or available offline
- [ ] Database credentials verified and stored securely

### Code Review

- [ ] All three FIXED migration files reviewed
- [ ] Changes compared to original migrations
- [ ] Rollback SQL blocks copied to safe location
- [ ] No unexpected changes in migrations
- [ ] Comments and documentation reviewed

### Dependencies Verified

- [ ] PostgreSQL 14+ confirmed (`SELECT version();`)
- [ ] Supabase project confirmed ready
- [ ] `levenshtein()` function available (check: `SELECT levenshtein('a','b');`)
- [ ] pgvector NOT required (Phase 2 is optional)
- [ ] No existing triggers/functions with same names
  ```sql
  SELECT * FROM pg_triggers WHERE tgname LIKE 'trigger_enforce%';
  SELECT * FROM pg_proc WHERE proname LIKE 'check_%' OR proname LIKE 'enforce_%';
  ```

---

## Migration Execution (Staging)

### Step 1: Run Schema Hardening Migration

```bash
# In psql or Supabase SQL Editor:
\i supabase/migrations/20260114_schema_hardening_constraints_FIXED.sql
```

**Verification:**

```sql
-- Check constraints created
\d public.events  -- look for triggers
\d public.user_profiles  -- look for new indexes

-- Check trigger exists
SELECT * FROM pg_triggers WHERE tgname = 'trigger_enforce_future_event_start_time';

-- Check indexes created
SELECT indexname FROM pg_indexes
WHERE tablename IN ('events', 'user_profiles', 'event_registrations')
  AND indexname LIKE 'idx_%';
```

**Expected Output:**

- 1 new trigger
- 9 new indexes
- 4 new foreign keys
- 4 new check constraints
- 1 column renamed

**Timing:** 5-10 seconds

**Errors to Watch:**

- `duplicate_object` (constraint/index already exists) → OK, idempotent
- `foreign key violation` → FAIL, review data integrity
- `syntax error` → FAIL, check migration file

### Step 2: Run Usage Quotas Migration

```bash
# In psql or Supabase SQL Editor:
\i supabase/migrations/20260114_usage_quotas_and_rate_limits_FIXED.sql
```

**Verification:**

```sql
-- Check tables created
\d public.usage_quotas
\d public.quota_limits

-- Check functions created
SELECT proname FROM pg_proc
WHERE proname IN ('check_and_increment_quota', 'enforce_create_event_quota',
                   'enforce_register_event_quota', 'enforce_verification_request_quota',
                   'cleanup_old_quotas')
ORDER BY proname;

-- Check triggers created
SELECT tgname FROM pg_triggers
WHERE tgname LIKE 'trigger_enforce%'
ORDER BY tgname;

-- Check quota limits inserted
SELECT * FROM public.quota_limits;
```

**Expected Output:**

- 2 new tables (usage_quotas, quota_limits)
- 5 new functions
- 3 new triggers
- 5 rows in quota_limits (default values)
- 4 new indexes on usage_quotas

**Timing:** 3-5 seconds

**Errors to Watch:**

- `relation "quota_limits" already exists` → OK, idempotent
- `permission denied` for RLS → FAIL, check role permissions
- `row_security = off not supported` → FAIL, PostgreSQL version too old

### Step 3: Run Event Similarity Detection Migration

```bash
# In psql or Supabase SQL Editor:
\i supabase/migrations/20260114_event_similarity_detection_FIXED.sql
```

**Verification:**

```sql
-- Check table created
\d public.event_similarity_checks

-- Check functions created
SELECT proname FROM pg_proc
WHERE proname IN ('normalize_event_title', 'check_event_similarity_phase1',
                   'detect_duplicate_events', 'log_similarity_check')
ORDER BY proname;

-- Check RLS policies
SELECT policyname FROM pg_policies
WHERE tablename = 'event_similarity_checks'
ORDER BY policyname;

-- Test similarity function
SELECT * FROM public.detect_duplicate_events(
  'Test Event',
  'New York',
  now() + interval '7 days',
  '00000000-0000-0000-0000-000000000000'::uuid
);
-- Expected: empty result (no existing events)
```

**Expected Output:**

- 1 new table (event_similarity_checks)
- 4 new functions
- 4 new RLS policies
- 4 new indexes
- Test query returns empty set

**Timing:** 2-3 seconds

**Errors to Watch:**

- `function levenshtein does not exist` → FAIL, need PostgreSQL 14+
- `relation "event_similarity_checks" already exists` → OK, idempotent
- `permission denied` for RLS → FAIL, check role permissions

---

## Functional Testing (Staging)

### Test 1: Trigger Enforcement - Event Quota

```sql
-- Create test user (or use existing)
-- In Supabase Auth: Create a test user, copy UUID

-- Insert test event #1 (should succeed)
INSERT INTO public.events (title, location, start_at, created_by)
VALUES ('Event 1', 'NYC', now() + interval '7 days', '<TEST_UUID>')
RETURNING id;

-- Check quota was incremented
SELECT * FROM public.usage_quotas
WHERE user_id = '<TEST_UUID>' AND action = 'create_event' AND date = CURRENT_DATE;
-- Expected: 1 row, count = 1

-- Insert events #2-5 (should succeed)
INSERT INTO public.events (title, location, start_at, created_by)
VALUES
  ('Event 2', 'NYC', now() + interval '8 days', '<TEST_UUID>'),
  ('Event 3', 'NYC', now() + interval '9 days', '<TEST_UUID>'),
  ('Event 4', 'NYC', now() + interval '10 days', '<TEST_UUID>'),
  ('Event 5', 'NYC', now() + interval '11 days', '<TEST_UUID>');

-- Check quota
SELECT count FROM public.usage_quotas
WHERE user_id = '<TEST_UUID>' AND action = 'create_event' AND date = CURRENT_DATE;
-- Expected: count = 5

-- Insert event #6 (should FAIL with quota_exceeded)
INSERT INTO public.events (title, location, start_at, created_by)
VALUES ('Event 6', 'NYC', now() + interval '12 days', '<TEST_UUID>')
RETURNING id;
-- Expected ERROR: quota_exceeded:create_event: Limit of 5 per day exceeded (current: 6)
```

**Pass Criteria:**

- [x] Events 1-5 insert successfully
- [x] Event #6 fails with `quota_exceeded:create_event` error
- [x] usage_quotas shows count incrementing 1→5

### Test 2: Trigger Enforcement - Registration Quota

```sql
-- Get an existing event ID
SELECT id FROM public.events LIMIT 1 INTO EVENT_UUID;

-- Register user for events 1-200 (should succeed, but we'll test with fewer)
-- For brevity, test with 3 registrations:

INSERT INTO public.event_registrations (event_id, user_id)
VALUES
  (EVENT_UUID, '<TEST_UUID>'),
  -- (Can't register twice - unique constraint will fail)

-- Instead: Register for different events
SELECT id FROM public.events WHERE created_by != '<TEST_UUID>' LIMIT 5
INSERT INTO public.event_registrations (event_id, user_id)
VALUES
  ('<EVENT_1>', '<TEST_UUID>'),
  ('<EVENT_2>', '<TEST_UUID>'),
  ('<EVENT_3>', '<TEST_UUID>');

-- Check quota
SELECT count FROM public.usage_quotas
WHERE user_id = '<TEST_UUID>' AND action = 'register_event' AND date = CURRENT_DATE;
-- Expected: count = 3

-- Verify unique constraint works (can't register twice for same event)
INSERT INTO public.event_registrations (event_id, user_id)
VALUES ('<EVENT_1>', '<TEST_UUID>');
-- Expected ERROR: duplicate key value violates unique constraint
```

**Pass Criteria:**

- [x] Registrations insert successfully
- [x] usage_quotas increments for register_event
- [x] Duplicate registration blocked by unique constraint

### Test 3: Similarity Detection

```sql
-- Create two similar events
INSERT INTO public.events (title, location, start_at, created_by)
VALUES
  ('Rock Concert 2026', 'Madison Square Garden', now() + interval '30 days', '<TEST_UUID>'),
  ('Rock Concert 26', 'Madison Square Garden', now() + interval '31 days', '<TEST_UUID>');

-- Get first event's UUID, then check for similar events
SELECT similar_event_id, similarity_score, is_potential_duplicate, reason
FROM public.detect_duplicate_events(
  'Rock Concert 2026',
  'Madison Square Garden',
  now() + interval '30 days',
  '<TEST_UUID>'
);
-- Expected: 1 row, similarity >= 0.75, is_potential_duplicate = true
```

**Pass Criteria:**

- [x] detect_duplicate_events finds similar event
- [x] similarity_score >= 0.6
- [x] is_potential_duplicate = true (if >= 0.85)
- [x] reason contains percentage

### Test 4: Atomic Function (Race Condition Test)

```sql
-- This is a stress test for the atomic INSERT...ON CONFLICT
-- Run this multiple times in parallel

DELETE FROM public.usage_quotas
WHERE user_id = '<TEST_UUID>' AND action = 'test_action' AND date = CURRENT_DATE;

-- Run 10 concurrent calls (in a transaction to simulate parallel):
BEGIN;
SELECT * FROM public.check_and_increment_quota('<TEST_UUID>', NULL, 'test_action');
SELECT * FROM public.check_and_increment_quota('<TEST_UUID>', NULL, 'test_action');
SELECT * FROM public.check_and_increment_quota('<TEST_UUID>', NULL, 'test_action');
SELECT * FROM public.check_and_increment_quota('<TEST_UUID>', NULL, 'test_action');
SELECT * FROM public.check_and_increment_quota('<TEST_UUID>', NULL, 'test_action');
COMMIT;

-- Check result
SELECT count FROM public.usage_quotas
WHERE user_id = '<TEST_UUID>' AND action = 'test_action' AND date = CURRENT_DATE;
-- Expected: count = 5 (NOT higher - no race condition)
```

**Pass Criteria:**

- [x] count = 5 (exactly)
- [x] No "duplicate key" errors
- [x] No lost updates

### Test 5: RLS Enforcement

```sql
-- As service_role (admin):
SELECT * FROM public.usage_quotas;
-- Expected: returns all rows

-- As regular user '<TEST_UUID>':
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "<TEST_UUID>"}'

SELECT * FROM public.usage_quotas;
-- Expected: returns only rows where user_id = '<TEST_UUID>'

-- Try to see another user's quota:
SELECT * FROM public.usage_quotas WHERE user_id = '<OTHER_UUID>';
-- Expected: 0 rows (RLS blocks it)
```

**Pass Criteria:**

- [x] Service role sees all quotas
- [x] User sees only own quotas
- [x] User cannot see other users' quotas

### Test 6: Column Rename (date_of_birth)

```sql
-- Check column exists and is correct type
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name IN ('date_of_birth', 'Date of Birth');
-- Expected: 1 row, column_name = 'date_of_birth', data_type = 'date'

-- Update and verify
UPDATE public.user_profiles
SET date_of_birth = '1990-01-01'
WHERE user_id = '<TEST_UUID>';

SELECT date_of_birth FROM public.user_profiles
WHERE user_id = '<TEST_UUID>';
-- Expected: 1990-01-01
```

**Pass Criteria:**

- [x] Old column "Date of Birth" doesn't exist
- [x] New column date_of_birth exists
- [x] Data preserved (if was migrated)

---

## Staging Sign-Off

After all tests pass, create a summary:

```
STAGING TEST RESULTS
====================
Date: _______________
Tester: _____________

[✓] All three migrations run without error
[✓] Test 1 - Event quota trigger works
[✓] Test 2 - Registration quota trigger works
[✓] Test 3 - Similarity detection works
[✓] Test 4 - Atomic function (no race conditions)
[✓] Test 5 - RLS enforcement works
[✓] Test 6 - Column rename complete
[✓] No data loss observed
[✓] Indexes created successfully
[✓] Triggers execute without error

Approval: _____________ (Manager/Lead)
Date: _________________

Approved for production deployment: [ ] YES [ ] NO
Comments: _________________________________________________________________
```

---

## Production Migration

### Pre-Migration (24 hours before)

- [ ] Final backup of production database
- [ ] Verify backup integrity
- [ ] Schedule maintenance window (low-traffic time)
- [ ] Notify all users via email/status page
- [ ] Have rollback scripts ready
- [ ] Team briefing 1 hour before

### Migration Window (Production)

**Step 1: Backup**

```bash
pg_dump $PROD_CONNECTION_STRING > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql
# Verify file size is reasonable
ls -lh backup_*.sql
```

**Step 2: Deploy Migration 1**

```bash
# Via Supabase: Upload to supabase/migrations/20260114_schema_hardening_constraints_FIXED.sql
# Or via CLI: supabase db push
# Or via psql: \i migration_1.sql

# Monitor for errors
```

**Step 3: Deploy Migration 2**

```bash
# Same as Step 2 for migration 2
```

**Step 4: Deploy Migration 3**

```bash
# Same as Step 2 for migration 3
```

**Step 5: Verify**

```sql
-- Run all verification queries from "Functional Testing" section above
-- Confirm no errors in logs
-- Monitor performance
```

**Step 6: Announce**

- [ ] Update status page: "Migration complete, monitoring"
- [ ] Notify team: "All systems nominal"
- [ ] Begin 24-hour monitoring period

### Post-Migration (24-hour monitoring)

**Hour 1:**

- [ ] Monitor error logs for quota/trigger errors
- [ ] Test creating events (should enforce quotas)
- [ ] Test registering for events
- [ ] Check similarity detection working

**Hours 2-24:**

- [ ] Monitor quota_exceeded error rate
- [ ] Monitor event creation success rate
- [ ] Check database performance (slow queries?)
- [ ] Verify no failed transactions

**Monitoring Queries:**

```sql
-- Error rate (should be near 0 except for legitimate quota_exceeded)
SELECT DATE_PART('hour', created_at), COUNT(*)
FROM public.usage_quotas
WHERE date = CURRENT_DATE
GROUP BY DATE_PART('hour', created_at)
ORDER BY DATE_PART('hour', created_at);

-- Peak quota usage
SELECT action, MAX(count) as peak_usage, limit_per_day
FROM public.usage_quotas
JOIN public.quota_limits USING (action)
WHERE date = CURRENT_DATE
GROUP BY action, limit_per_day;

-- Users hitting quota limits
SELECT COUNT(DISTINCT user_id)
FROM public.usage_quotas
WHERE date = CURRENT_DATE
  AND count >= (SELECT limit_per_day FROM quota_limits WHERE action = 'create_event');
```

---

## Rollback Procedure (If Needed)

### Immediate Rollback (if critical errors)

```bash
# Option 1: Restore from backup
psql $PROD_CONNECTION_STRING < backup_before_migration_*.sql

# Option 2: Run rollback script (at bottom of each migration file)
psql $PROD_CONNECTION_STRING < rollback_all.sql
```

**Rollback Script (rollback_all.sql):**

```sql
-- Copy the commented rollback blocks from each migration file
-- Run in reverse order:

-- Rollback Migration 3
DROP TRIGGER IF EXISTS trigger_check_duplicate_event_on_create ON public.events;
DROP FUNCTION IF EXISTS public.check_event_duplicate_on_create();
DROP FUNCTION IF EXISTS public.check_event_similarity_phase2(vector, uuid, uuid, float);
DROP FUNCTION IF EXISTS public.log_similarity_check(uuid, uuid, float, text, text);
DROP FUNCTION IF EXISTS public.detect_duplicate_events(text, text, timestamptz, uuid, uuid);
DROP FUNCTION IF EXISTS public.check_event_similarity_phase1(text, text, timestamptz, uuid, uuid);
DROP FUNCTION IF EXISTS public.normalize_event_title(text);
DROP TABLE IF EXISTS public.event_similarity_checks;

-- Rollback Migration 2
-- [Copy from migration 2 rollback block]

-- Rollback Migration 1
-- [Copy from migration 1 rollback block]
```

### Graceful Rollback (after 24+ hours)

If you decide the migrations aren't working well but haven't broken anything critical:

1. Drop individual triggers:

```sql
DROP TRIGGER trigger_enforce_create_event_quota ON public.events;
-- This disables quota enforcement while keeping the data
```

2. Or disable temporarily:

```sql
ALTER TABLE public.events DISABLE TRIGGER trigger_enforce_create_event_quota;
-- Re-enable later: ALTER TABLE public.events ENABLE TRIGGER ...
```

---

## Rollback Decision Tree

```
Is it critical (data loss, total failure)?
├─ YES → Restore backup immediately
└─ NO → Continue below

Are there quota errors but events still creating?
├─ YES → Disable specific trigger, debug issue
└─ NO → Continue below

Is similarity detection causing slowness?
├─ YES → Drop event_similarity_checks trigger, keep function
└─ NO → KEEP MIGRATION, monitor more

Decision: ROLLBACK or KEEP?
├─ ROLLBACK → Follow "Immediate Rollback" section
└─ KEEP → Document issue, schedule fix
```

---

## Post-Rollback Recovery

If you rollback and want to try again:

1. Identify the root cause
2. Update the migration file
3. Test in staging again (full suite)
4. Deploy with fresh timestamp: `20260114_v2_...sql`
5. Document what changed

---

## Success Criteria

Migration is **SUCCESSFUL** when:

- [x] All three migrations run without errors
- [x] All 6 functional tests pass
- [x] 24-hour monitoring shows normal operation
- [x] No quota_exceeded errors for legitimate use
- [x] Similarity detection not causing slowness
- [x] No data loss
- [x] All users can still create/register for events
- [x] RLS policies correctly restrict access

---

## Troubleshooting

### Problem: `quota_exceeded:create_event` on every event

**Cause:** Database quota trigger firing, but quotas resetting improperly

**Solution:**

```sql
-- Check quota_limits table
SELECT * FROM public.quota_limits;

-- Check usage_quotas for today
SELECT action, date, COUNT(*) FROM public.usage_quotas
WHERE date = CURRENT_DATE
GROUP BY action, date;

-- If quota_limits is missing, insert:
INSERT INTO public.quota_limits (action, limit_per_day, description)
VALUES ('create_event', 5, 'Max events per day')
ON CONFLICT (action) DO NOTHING;
```

### Problem: Similarity detection very slow

**Cause:** Many events, levenshtein() is O(n\*m)

**Solution:**

```sql
-- Disable similarity checking temporarily
DROP TRIGGER trigger_check_duplicate_event_on_create ON public.events;

-- Keep function but don't call it
-- Re-enable when data is smaller or pgvector is available

-- Or: Run detect_duplicate_events() async
-- Don't call in BEFORE INSERT trigger
```

### Problem: RLS "permission denied" errors

**Cause:** Row security policies too restrictive

**Solution:**

```sql
-- Check RLS is enabled
SELECT pg_class.relrowsecurity FROM pg_class
WHERE relname = 'usage_quotas';

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'usage_quotas';

-- If broken, drop and recreate:
DROP POLICY IF EXISTS policy_name ON table_name;
CREATE POLICY new_policy_name ON table_name ...;
```

---

## Documentation Links

- `MIGRATION_FIXES_SUMMARY.md` - High-level overview of fixes
- `MIGRATION_TECHNICAL_REFERENCE.md` - Detailed function/trigger documentation
- `DEPLOYMENT_GUIDE.md` - Complete deployment procedures (from original work)
- Rollback SQL blocks - At end of each migration file

---

## Sign-Off

**Prepared by:** **\*\***\_\_\_\_**\*\***  
**Date:** ****\*\*****\_\_\_\_****\*\*****  
**Approved by:** **\*\*\*\***\_**\*\*\*\***  
**Approval Date:** **\*\***\_\_\_**\*\***

**Ready for production:** [ ] YES [ ] NO

---

**Generated:** 2026-02-03  
**Version:** 1.0  
**Status:** Ready for staging testing
