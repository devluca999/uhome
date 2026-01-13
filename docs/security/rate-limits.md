# Rate Limits

## Overview

Rate limiting is implemented at **two levels** to prevent abuse and protect system resources:

1. **Supabase Edge Functions** - First line of defense (request-level)
2. **PostgreSQL** - Final enforcement layer (database-level)

## Implementation

### Edge Functions

Edge Functions handle request-level throttling before database writes:

- `supabase/functions/rate-limit-upload/index.ts` - Upload limits
- `supabase/functions/rate-limit-message/index.ts` - Messaging limits
- `supabase/functions/rate-limit-invite/index.ts` - Invite limits
- `supabase/functions/abuse-guard/index.ts` - General abuse detection

### PostgreSQL

PostgreSQL enforces hard caps that cannot be bypassed:

- `supabase/migrations/add_rate_limit_tables.sql` - Tracking tables
- `supabase/migrations/enforce_invite_caps.sql` - Invite limits
- `supabase/migrations/enforce_upload_limits.sql` - Upload limits
- `supabase/migrations/add_abuse_guard_triggers.sql` - Abuse guards

## Rate Limit Configuration

### Upload Limits

| Limit | Staging | Production |
|-------|---------|------------|
| Max file size | 10MB | 10MB |
| Max uploads per minute | 20 | 10 |
| Max uploads per day | 100 | 50 |

### Messaging Limits

| Limit | Staging | Production |
|-------|---------|------------|
| Max messages per minute | 40 | 20 |
| Cooldown after failures | 5 seconds | 5 seconds |
| Min message length | 1 character | 1 character |

### Invite Limits

| Limit | Staging | Production |
|-------|---------|------------|
| Max active invites per property | 5 | 5 |
| Max invites per minute | 3 | 3 |

**Note:** Invite limits are the same for staging and production.

## Enforcement

### Edge Function Enforcement

Edge Functions check limits before allowing operations:

```typescript
// Check uploads in last minute
const { count: uploadsLastMinute } = await supabase
  .from('rate_limit_tracking')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .eq('action_type', 'upload')
  .gte('created_at', oneMinuteAgo);

if (uploadsLastMinute >= maxPerMinute) {
  return new Response(
    JSON.stringify({ error: 'Rate limit exceeded' }),
    { status: 429 }
  );
}
```

### Database Enforcement

PostgreSQL triggers enforce hard caps:

```sql
CREATE FUNCTION enforce_invite_cap()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM tenant_invites
      WHERE property_id = NEW.property_id
        AND expires_at > NOW()) >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 active invites per property';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Error Responses

Rate limit violations return:

- **Status Code:** `429 Too Many Requests`
- **Error Message:** Clear, user-friendly message
- **Retry-After:** Suggested wait time (in seconds)

Example:
```json
{
  "error": "Upload rate limit exceeded. Maximum 10 uploads per minute.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 60
}
```

## Logging

All rate limit violations are logged to `abuse_events` table:

- `user_id` - User who violated limit
- `action_type` - Type of action (upload, message, invite)
- `violation_type` - Type of violation (rate_limit_per_minute, etc.)
- `rate_limit_violation` - Always `true` for rate limits
- `details` - JSONB with limit details

## Testing Rate Limits

E2E tests verify rate limit enforcement:

```typescript
test('staging blocks upload spam', async ({ page }) => {
  // Try to upload 20 files rapidly
  for (let i = 0; i < 20; i++) {
    await attemptUpload();
  }
  
  // Should hit rate limit
  await expectRateLimitError();
});
```

See `tests/e2e/abuse/rate-limit-tests.spec.ts` for full test coverage.

## UI Feedback

When rate limits are hit, the UI shows:

- Clear error message
- Retry suggestion
- Graceful degradation (don't crash)

## Related Documentation

- [Abuse Prevention](./abuse-prevention.md) - Abuse guard implementation
- [RLS Policies](./rls.md) - Row Level Security
- [Staging-Only Testing](../testing/staging-only.md) - Environment setup

