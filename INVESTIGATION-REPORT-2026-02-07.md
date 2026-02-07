# Apps Scripts Platform - Execution Sync Failure Investigation
## Date: 2026-02-07 20:26 UTC

### 🔴 Issue Status: RECURRING (Not Fixed)

**Error**: "Execution sync complete: 0 synced, 78 failed"

---

## Investigation Summary

### Is this the SAME issue from earlier today (2026-02-07) or NEW?
**SAME ISSUE** - The problem reported as "fixed" earlier today was NOT actually resolved. The execution sync continues to fail on every hourly run.

### Root Cause Analysis

**Primary Issue: 75 Stale Scripts in Database (96% failure rate)**

The database contains references to 78 Google Apps Scripts, but:
- **75 scripts** (96%) have invalid/deleted script IDs → fail with "STALE: Invalid script ID"
- **3 scripts** (4%) hit Google API quota limits → fail with "Quota exceeded"
- **0 scripts** sync successfully

**Why Scripts Are Stale:**
1. Scripts were deleted from Google Apps Script console
2. Script IDs changed when scripts were recreated
3. Scripts moved to different Google accounts
4. Permission changes (owner transferred, access revoked)

### Evidence from Logs

```
Syncing executions for 78 scripts...

Batch 1/8 (10 scripts)
  Fetching executions for: Master Works DB connection
    STALE: Invalid script ID
  Fetching executions for: Workable integration
    STALE: Invalid script ID
  ...
  
Execution sync complete: 0 synced, 78 failed

⚠️  75 stale scripts detected:
    - 1wNYA_BHLdcZaxsM4kvMCZcrsaptqzikF82n93g3OmuYURgch6ai0uTIO
    - 1mLrNp_1oKA2mpwDngCCXYnm4K7uKf1OnqOCxLEn-vtYksmjkF82n93g3OmuYURgch6ai0uTIO
    ...
```

### Why Previous "Fix" Didn't Prevent This

**Fixes Applied Earlier Today:**
1. ✅ Rate limiting (600ms between calls, 3s between batches)
2. ✅ Batch processing (10 scripts per batch)
3. ✅ Retry logic with exponential backoff
4. ✅ Script validation before fetching executions
5. ❌ **Stale script cleanup** - IDENTIFIED but NOT IMPLEMENTED

**What the Code Does:**
```typescript
// From execution-sync.ts line ~200
const validation = await validateScriptId(script.id)
if (!validation.valid) {
  console.log(`    STALE: ${validation.error}`)
  staleScripts.push(script.id)
  // ❌ But it doesn't DELETE the stale script!
}
```

The system correctly **identifies** stale scripts and logs:
> "75 stale script(s) detected (invalid/deleted). Consider removing them from the database."

But it **never removes them**. So every hour, the cron job:
1. Tries to sync 78 scripts
2. Validates each script ID
3. Finds 75 are stale
4. Logs the error
5. **Repeats forever** ♻️

### Secondary Issues

1. **Google API Quota Exhaustion**
   - Hitting "Management requests per minute per user" limit
   - Caused by retrying stale scripts 3 times each
   - 75 stale scripts × 3 retries = 225+ wasted API calls/hour

2. **OAuth Scope Insufficient**
   - Some scripts show "insufficient authentication scopes"
   - Need `https://www.googleapis.com/auth/script.processes` scope
   - Currently using more limited scopes

3. **Resource Waste**
   - Database queries for 78 scripts
   - API calls for validation (78 × hourly)
   - Retry attempts (225+ calls/hour wasted)
   - Log spam (thousands of "STALE" messages)

---

## Recommended Permanent Solution

### 🎯 Short-Term Fix (Immediate)

1. **Run Cleanup Script**
   ```bash
   cd /home/ec2-user/clawd/projects/apps-scripts-platform
   npx tsx scripts/cleanup-stale-scripts.ts --dry-run  # Preview
   npx tsx scripts/cleanup-stale-scripts.ts            # Execute
   ```
   
   This will:
   - Validate all 78 scripts
   - Delete the 75 stale ones from database
   - Remove all related data (executions, functions, etc.)

2. **Verify Fix**
   - Trigger execution sync manually
   - Should now show "3 synced, 0 failed" (or similar)
   - Monitor hourly cron logs

### 🛠️ Long-Term Solution (Prevent Recurrence)

**Option A: Automatic Cleanup (Recommended)**

Modify `execution-sync.ts` to automatically delete stale scripts:

```typescript
// After validation fails
if (!validation.valid) {
  console.log(`    STALE: ${validation.error} - Removing from database`)
  await prisma.script.delete({ where: { id: script.id } })
  staleScripts.push(script.id)
  continue
}
```

**Option B: Scheduled Cleanup Job**

Add weekly cleanup cron:
```yaml
# railway.toml or separate service
[cron]
schedule = "0 2 * * 0"  # Sunday 2am
command = "npx tsx scripts/cleanup-stale-scripts.ts"
```

**Option C: Flag-Based Approach**

Add `isStale: boolean` field to Script model:
- Mark stale on first detection
- Skip in sync after marked
- Delete after 7 days of being stale
- Allows manual review before deletion

### 🔐 Fix OAuth Scope Issue

Update Google OAuth consent and credentials:
1. Add scope: `https://www.googleapis.com/auth/script.processes`
2. Re-run `clasp login --creds` with new scope
3. Update `src/lib/google-auth.ts` scopes array

### 📊 Add Monitoring

1. **Stale Script Alert**
   - Send notification when >5 stale scripts detected
   - Weekly summary of stale scripts

2. **Sync Health Dashboard**
   - Success rate trend
   - Stale script count over time
   - API quota usage

3. **Logging Improvements**
   - Reduce log spam for known-stale scripts
   - Daily summary instead of per-script logs

---

## Should This Be Added to recurring-issues.md?

**YES** - This should be documented as a recurring issue because:

1. ✅ **Recurs frequently**: Scripts become stale as teams update/delete/move them
2. ✅ **Impacts reliability**: 96% failure rate every hour
3. ✅ **Resource waste**: Hundreds of wasted API calls, log spam
4. ✅ **Not self-healing**: Requires manual intervention every time
5. ✅ **Known pattern**: Same root cause (stale script IDs) will happen again

### Proposed Entry for recurring-issues.md

```markdown
## Apps Scripts Platform - Stale Script IDs

**Symptom**: Execution sync reports "X synced, 78 failed" with "STALE: Invalid script ID" errors

**Root Cause**: Database contains references to deleted/moved Google Apps Scripts

**Detection**:
- Check Railway logs for "STALE: Invalid script ID"
- Check execution sync endpoint: GET /api/sync/executions
- Look for "⚠️  X stale scripts detected" message

**Fix**:
1. Run cleanup script:
   ```bash
   cd projects/apps-scripts-platform
   npx tsx scripts/cleanup-stale-scripts.ts --dry-run
   npx tsx scripts/cleanup-stale-scripts.ts
   ```
2. Verify sync: POST /api/sync/executions
3. Monitor logs for 1-2 hours

**Prevention**:
- Implement automatic cleanup (Option A in investigation report)
- Or schedule weekly cleanup job (Option B)
- Consider flag-based approach for review (Option C)

**Last Occurrence**: 2026-02-07 (75 stale scripts removed)
```

---

## Next Steps

1. ⏰ **Immediate** (now): Run cleanup script to remove 75 stale scripts
2. 🔧 **Today**: Implement automatic cleanup (Option A)
3. 📝 **Today**: Add to recurring-issues.md
4. 🔐 **This week**: Fix OAuth scope for execution logging
5. 📊 **This week**: Add stale script monitoring/alerts
6. 📚 **Document**: Update README with maintenance procedures

---

## Technical Details

### Files Involved
- `/src/lib/execution-sync.ts` - Main execution sync logic
- `/src/app/api/sync/executions/route.ts` - API endpoint
- `/scripts/cleanup-stale-scripts.ts` - New cleanup script (created)
- `/prisma/schema.prisma` - Database schema

### Database Impact
- 75 scripts to delete
- Cascade delete: files, executions, functions, APIs, triggers, connected files
- Estimated cleanup: ~1,000+ related records

### API Quota Usage
- **Before cleanup**: ~225+ calls/hour (wasted)
- **After cleanup**: ~10-20 calls/hour (productive)
- **Savings**: ~200 calls/hour = ~4,800 calls/day

---

*Investigation completed by: Subagent (apps-scripts-sync-failures)*
*Report timestamp: 2026-02-07 20:26 UTC*
