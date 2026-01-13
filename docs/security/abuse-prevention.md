# Abuse Prevention

## Overview

Abuse guards detect and prevent malicious or suspicious behavior patterns. They work alongside rate limits to provide comprehensive protection.

## Implementation

Abuse guards are implemented at **two levels**:

1. **Supabase Edge Functions** - Pattern detection (burst activity, suspicious behavior)
2. **PostgreSQL** - Hard enforcement (ownership validation, relationship integrity)

## Abuse Detection Patterns

### Burst Activity

Detects rapid actions in short time windows:

- **Threshold:** More than 10 actions in 10 seconds
- **Response:** Temporary block with cooldown
- **Logging:** Logged to `abuse_events` table

### Suspicious Activity

Detects overall high activity:

- **Threshold:** More than 30 actions per minute
- **Response:** Rate limit with retry suggestion
- **Logging:** Logged to `abuse_events` table

### Repeated Violations

Detects users with multiple violations:

- **Threshold:** 5+ violations in last hour
- **Response:** Temporary account restriction (1 hour)
- **Logging:** All violations logged

## Edge Function Implementation

### Abuse Guard Function

`supabase/functions/abuse-guard/index.ts` detects:

- Burst activity (rapid actions in short window)
- Suspicious overall activity (high actions per minute)
- Repeated violations (multiple violations in short time)

### Response Codes

- `429 Too Many Requests` - Rate limit or abuse detected
- `403 Forbidden` - Account temporarily restricted

## Database Enforcement

### Ownership Validation

PostgreSQL triggers validate ownership before mutations:

```sql
CREATE FUNCTION validate_property_ownership()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM properties
    WHERE id = NEW.property_id
      AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You do not have permission';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Relationship Integrity

Triggers ensure relationships are valid:

- Tenant assignments match property ownership
- Work orders match property/tenant relationships
- Messages match lease access

## Abuse Events Table

All abuse events are logged to `abuse_events` table:

```sql
CREATE TABLE abuse_events (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  details JSONB,
  rate_limit_violation BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
);
```

## Testing Abuse Guards

E2E tests verify abuse guard enforcement:

```typescript
test('rapid invite creation (bot-like behavior)', async ({ page }) => {
  // Rapidly create 15 invites
  for (let i = 0; i < 15; i++) {
    await createInvite();
  }
  
  // Should trigger abuse guard
  await expectAbuseError();
});
```

See `tests/e2e/abuse/abuse-guard-tests.spec.ts` for full test coverage.

## Edge Cases Tested

- ✅ Rapid invite creation (bot-like behavior)
- ✅ Tenant opening same invite in multiple tabs
- ✅ Network disconnect mid-mutation
- ✅ Realtime subscription loss + recovery
- ✅ User deleted while active session open
- ✅ Dev mode toggled mid-session

## Monitoring

Abuse events are monitored for:

- Patterns of abuse
- Effectiveness of guards
- False positives
- System performance impact

## Related Documentation

- [Rate Limits](./rate-limits.md) - Rate limiting
- [RLS Policies](./rls.md) - Row Level Security
- [Staging-Only Testing](../testing/staging-only.md) - Environment setup

