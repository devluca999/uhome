# Newsletter Tracking Endpoints

This document describes the API endpoints needed for tracking newsletter opens and clicks.

## Overview

Newsletter campaigns include tracking pixels and click tracking URLs that need to be handled by API endpoints. These endpoints should be implemented in your backend (e.g., as Supabase Edge Functions or API routes).

## Endpoints

### 1. Track Newsletter Open

**Endpoint:** `GET /api/newsletter/track-open`

**Query Parameters:**
- `campaign` (required): Newsletter campaign ID
- `email` (required): Recipient email address (URL encoded)

**Response:**
- Returns a 1x1 transparent PNG image
- Status: 200 OK

**Implementation Notes:**
- Call `increment_newsletter_opened(campaign_id)` database function
- Optionally log individual opens for detailed analytics
- Return a 1x1 transparent PNG image

**Example:**
```
GET /api/newsletter/track-open?campaign=abc123&email=user%40example.com
```

### 2. Track Newsletter Click

**Endpoint:** `GET /api/newsletter/track-click`

**Query Parameters:**
- `campaign` (required): Newsletter campaign ID
- `url` (required): Original URL that was clicked (URL encoded)
- `email` (required): Recipient email address (URL encoded)

**Response:**
- Redirects to the original URL
- Status: 302 Found (redirect)

**Implementation Notes:**
- Call `increment_newsletter_clicked(campaign_id)` database function
- Optionally log individual clicks for detailed analytics
- Redirect to the decoded original URL

**Example:**
```
GET /api/newsletter/track-click?campaign=abc123&url=https%3A%2F%2Fexample.com&email=user%40example.com
→ Redirects to: https://example.com
```

## Supabase Edge Function Implementation

### Option 1: Create Edge Functions

Create two Supabase Edge Functions:

1. `supabase/functions/track-newsletter-open/index.ts`
2. `supabase/functions/track-newsletter-click/index.ts`

### Option 2: Single Function with Routing

Create a single function that handles both:

`supabase/functions/track-newsletter/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const url = new URL(req.url)
  const action = url.searchParams.get('action') // 'open' or 'click'
  const campaignId = url.searchParams.get('campaign')
  const email = url.searchParams.get('email')
  const originalUrl = url.searchParams.get('url')

  if (!campaignId || !email) {
    return new Response('Missing parameters', { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  if (action === 'open') {
    // Increment opened count
    await supabase.rpc('increment_newsletter_opened', {
      campaign_id: campaignId,
    })

    // Return 1x1 transparent PNG
    const png = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ])
    return new Response(png, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache' },
    })
  } else if (action === 'click') {
    if (!originalUrl) {
      return new Response('Missing URL parameter', { status: 400 })
    }

    // Increment clicked count
    await supabase.rpc('increment_newsletter_clicked', {
      campaign_id: campaignId,
    })

    // Redirect to original URL
    return Response.redirect(decodeURIComponent(originalUrl), 302)
  }

  return new Response('Invalid action', { status: 400 })
})
```

## Frontend Integration

The newsletter service (`src/lib/newsletter/newsletter-service.ts`) automatically:
- Adds tracking pixels to HTML emails when `trackOpens: true`
- Wraps links with tracking URLs when `trackClicks: true`

No additional frontend code is needed - the tracking is handled automatically when sending campaigns.

## Testing

1. Send a test newsletter campaign
2. Open the email and check that the tracking pixel loads
3. Click a link in the email and verify it redirects correctly
4. Check the campaign analytics in the admin panel to see open/click counts increment

## Future Enhancements

- Individual recipient tracking (who opened/clicked)
- Click heatmaps (which links were clicked most)
- Time-based analytics (when emails were opened)
- A/B testing support
- Unsubscribe handling via tracking endpoint
