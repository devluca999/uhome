# Monitoring and Observability — uhome

## Overview

This document describes what to monitor in production and where to look for issues.

## Where to Look

### Supabase Dashboard

- **Logs** → API logs, auth logs, database logs
- **Database** → Query performance, active connections
- **Auth** → Sign-ups, sign-ins, failures
- **Storage** → Bucket usage, upload errors

### Hosting Platform (Vercel / Netlify / etc.)

- **Deploy logs** — Build and deploy status
- **Function logs** — Edge/Serverless function errors
- **Analytics** — Page views, errors (if configured)

### Browser / Client

- **Console** — Client-side errors (check before release)
- **Network tab** — Failed requests, 4xx/5xx responses

## What to Monitor

| Area | What | Where |
|------|------|-------|
| Errors | 5xx, failed auth, RLS violations | Supabase logs, browser console |
| Latency | Slow queries, API response time | Supabase Dashboard, hosting logs |
| Usage | DB size, connections, storage | Supabase Dashboard |
| Auth | Sign-in failures, token refresh | Supabase Auth logs |

## Optional: Error Tracking (Sentry)

For production error tracking:

1. Install: `npm install @sentry/react`
2. Initialize in `main.tsx`:

```ts
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
})
```

3. Set `VITE_SENTRY_DSN` in production env
4. Wrap app with `<Sentry.ErrorBoundary>`

## Alerts (Recommended)

- Supabase: Enable email alerts for database issues (Dashboard → Project Settings)
- Hosting: Configure deploy failure notifications
- Optional: Uptime monitoring (e.g. UptimeRobot) for production URL
