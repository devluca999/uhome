# uhome Mobile Design System

> **Status:** Active — updated as mobile features ship  
> **Scope:** Web PWA (app.getuhome.app). React Native phase is post-MVP.  
> **Breakpoint:** `< 768px` (Tailwind `md`) is the mobile boundary.

---

## Core Philosophy

### Depth over scroll

Desktop shows everything simultaneously. Mobile shows **one clear at-a-glance view** and puts all detail **one tap away in a bottom sheet**. Nothing is removed — it is reorganised.

The landlord dashboard on desktop renders 6 metric cards, 2 charts, financial summaries, property profitability, smart insights, and an activity feed — all visible at once because wide screens support peripheral scanning. On a 390px phone that same content is 2,800px of scroll that users will not read.

The mobile answer is **layers, not lists**:

```
Tap metric card  →  Bottom sheet with full chart + breakdown
Tap property row →  Property detail sheet (tenants, orders, actions)
Tap work order   →  Order detail + status update controls
Tap insight pill →  Expanded insight + recommended action
```

The rule: **if it requires scrolling to reach on mobile, it belongs in a sheet.**

### Preserve the aesthetic — tighten the density

Every visual token from the desktop carries over unchanged:

- `glass-card` surfaces with `grain-overlay`
- Steel/slate `--primary` accent colour system
- `GrainOverlay` + `MatteLayer` on all containers
- Framer Motion entrance transitions (duration unchanged)
- Dark/light theme system via `ThemeProvider`
- All existing component library primitives

What changes is **density only**:

| Property | Desktop | Mobile |
|---|---|---|
| Card padding | `p-6` (24px) | `p-3` (12px) |
| Body font | 14px | 12px |
| Label font | 12px | 10px |
| Hero number | 36px | 28px |
| Grid columns | 3–4 col | 2 col max |
| Chart height | 300px fixed | `aspect-ratio: 4/3` |

---

## Navigation Architecture

### Desktop (≥ 768px) — header nav (unchanged)

Full horizontal nav bar with all items visible. No changes.

### Mobile (< 768px) — bottom tab bar

```
┌─────────────────────────────────┐
│  uhome              🔔   ☀      │  ← MobileTopBar (h-14)
│─────────────────────────────────│
│                                 │
│         Page content            │
│         pb-20 (clears nav)      │
│                                 │
│─────────────────────────────────│
│  🏠       💰       ⊞      ⚙    ···  │  ← MobileBottomNav
│ Home  Finances  Props  Ops  More │
└─────────────────────────────────┘
```

**Landlord tabs:**

| Tab | Route | Icon |
|---|---|---|
| Home | `/landlord/dashboard` | House |
| Finances | `/landlord/finances` | Currency |
| Properties | `/landlord/properties` | Grid |
| Operations | `/landlord/operations` | Wrench |
| More | Sheet → Documents, Messages, Settings, Notifications | Ellipsis |

**Tenant tabs:**

| Tab | Route | Icon |
|---|---|---|
| Home | `/tenant/dashboard` | House |
| Finances | `/tenant/finances` | Currency |
| Issues | `/tenant/maintenance` | Wrench |
| Messages | `/tenant/messages` | Chat |
| More | Sheet → Documents, Notifications, Settings | Ellipsis |

### MobileTopBar

- Height: `h-14` (56px)
- Left: logo + wordmark
- Right: notification bell + theme toggle
- No nav items — those live in the bottom bar
- Same `glass-nav` styling as desktop

### MobileBottomNav

- Fixed to bottom, `z-50`
- Background: `bg-background/95 backdrop-blur-md`
- `padding-bottom: env(safe-area-inset-bottom, 12px)` — iPhone home bar clearance
- Active item: filled icon + coloured label + 4px dot indicator below label
- Inactive: muted icon + muted label, `hover:text-foreground` on pointer devices

---

## Bottom Sheet Pattern

Bottom sheets are the **detail layer** on mobile. They replace inter-page navigation for contextual data.

### When to use a bottom sheet (not page navigation)

- Metric card tapped → breakdown sheet with chart + line items
- Property row tapped → property detail (tenants, orders, quick actions)
- Work order tapped → order detail + status dropdown
- Tenant row tapped → tenant detail + contact actions
- Smart insight tapped → full insight + recommended action button
- Create forms (property, work order, maintenance request) → full-height sheet

### When to use page navigation (not a sheet)

- Bottom tab switch (always full page swap)
- Settings (full page — needs full scroll depth)
- Finances (full page — complex charts need full width)
- Documents (full page — file browser needs persistent state)

### Sheet implementation

The existing `Drawer` component supports `side="bottom"`. On mobile, all drawers **automatically use `side="bottom"`** regardless of what prop is passed. Add this logic to `drawer.tsx`:

```tsx
const effectiveSide = isMobile ? 'bottom' : side
```

Sheet specifications:
- Max height: `max-h-[90vh]` with `overflow-y-auto`
- Handle: `w-8 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-2`
- Drag handle supports swipe-to-dismiss
- Backdrop: `bg-background/60 backdrop-blur-sm`

---

## Dashboard Mobile Layout

### Landlord Home (mobile)

Replace the multi-section scroll with a single-screen view:

```
┌─────────────────────────────────┐
│ April 2026                      │
│ $12,400          ← hero number  │
│ collected this month            │
│─────────────────────────────────│
│ 96% collection │ $480 owed │ 8  │  ← summary bar (3 cols)
│─────────────────────────────────│
│ Net income $9,240    tap →      │  ← single full-width card
│─────────────────────────────────│
│  Work orders 3  │  Occupancy 7/8 │  ← 2-col metric cards
│─────────────────────────────────│
│ Quick actions                   │
│ [Log rent] [Work order] [Invite]│
└─────────────────────────────────┘
```

**Rules:**
- Max 3 metric cards visible (no scroll to see metrics)
- Charts live in sheets only (tap metric → sheet with chart)
- Quick actions are 3 equal-width ghost buttons
- No financial summary section, no property profitability, no insights grid — all accessible via sheets

### Tenant Home (mobile)

Tenant dashboard is intentionally simpler. Tenants have one property, one rent status, a few requests. The mobile view should feel calm, not data-heavy.

```
┌─────────────────────────────────┐
│ Hey Jane 👋                     │
│─────────────────────────────────│
│ $1,800 due May 1                │  ← PaymentCard (prominent)
│ [Pay now]                       │
│─────────────────────────────────│
│ Your place                      │
│ Sunrise Apts 3B · 42 Oak St  →  │
│─────────────────────────────────│
│ Maintenance (2 open)            │
│ • HVAC heating    [Scheduled]   │
│ • Faucet repair   [Done]        │
│─────────────────────────────────│
│ [Request] [Message] [Documents] │
└─────────────────────────────────┘
```

No charts needed on tenant mobile. The rent status, place info, and open requests are the entire job-to-be-done.

---

## Grid Responsiveness

All grids must collapse correctly. Standard pattern:

```tsx
// Metric cards (3–4 col desktop)
className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"

// Feature cards (3 col desktop)
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"

// Two-panel layouts
className="grid grid-cols-1 lg:grid-cols-2 gap-6"

// Property/tenant lists (cards)
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
```

Never use a fixed column count without a `grid-cols-1` mobile fallback.

---

## Charts on Mobile

Recharts `ResponsiveContainer` needs explicit mobile constraints:

```tsx
// Desktop: fixed height
// Mobile: aspect ratio (prevents 0-height collapse)
<ResponsiveContainer width="100%" aspect={isMobile ? 2 : undefined} height={isMobile ? undefined : 300}>
```

On mobile:
- Remove x-axis labels (show on tap/tooltip only)
- Reduce y-axis ticks to 3 max
- Increase touch target on data points (8px radius minimum)
- Charts in sheets get full `90vw` width — no cramping

---

## Forms and Modals on Mobile

All create/edit forms switch to **full-height bottom sheets** on mobile:

```tsx
// In drawer.tsx — auto-switch side on mobile
const { isMobile } = useIsMobile()
const effectiveSide = isMobile ? 'bottom' : side
const heightClass = isMobile ? 'max-h-[95vh]' : ''
```

Modal max-width on mobile:
```tsx
className="sm:max-w-lg max-w-[95vw] max-h-[90vh] overflow-y-auto"
```

---

## Touch Optimisation

### Tap delay elimination

Add to `src/index.css`:
```css
button,
[role="button"],
a,
input,
select,
textarea {
  touch-action: manipulation;
}
```

This removes the 300ms double-tap detection delay on all interactive elements.

### Minimum touch targets

- All tappable elements: minimum `44px × 44px` (Apple HIG standard)
- Bottom nav items: `h-14` minimum
- List row items: `min-h-[48px]`
- FAB: `w-14 h-14` (56px)

### Scroll behaviour

```tsx
// All scrollable containers
style={{
  overscrollBehavior: 'contain',
  WebkitOverflowScrolling: 'touch',
}}
```

---

## FAB (Floating Action Button)

Each primary-action page gets a FAB above the bottom nav:

| Page | FAB action |
|---|---|
| Properties | Add property |
| Tenants | Invite tenant |
| Operations | Create work order |
| Finances | Log rent record |
| Tenant / Maintenance | Submit maintenance request |

FAB specs:
- Size: `w-14 h-14` (56px)
- Position: `fixed bottom-20 right-4` (above bottom nav + safe area)
- Background: `bg-primary`
- Shadow: `shadow-lg shadow-primary/40`
- Icon: `Plus` (24px, white)
- Never on Dashboard, Documents, Messages, Settings

---

## PWA Configuration

`public/manifest.webmanifest`:
```json
{
  "name": "uhome",
  "short_name": "uhome",
  "description": "Property management made simple",
  "start_url": "/landlord/dashboard",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#111318",
  "background_color": "#111318",
  "icons": [
    { "src": "/logo.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/logo.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

`index.html` viewport:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="theme-color" content="#111318" />
```

---

## Implementation Checklist

### Phase 1 — Navigation (unblocks everything)
- [ ] `useIsMobile` hook (`window.innerWidth < 768` + resize listener)
- [ ] `MobileTopBar` component
- [ ] `MobileBottomNav` component (landlord + tenant variants)
- [ ] Update `landlord-layout.tsx` — render mobile layout when `isMobile`
- [ ] Update `tenant-layout.tsx` — render mobile layout when `isMobile`
- [ ] Admin layout — hamburger + slide-over drawer on mobile

### Phase 2 — Dashboard restructure
- [ ] Landlord dashboard — mobile view (summary bar, 3 metric cards, quick actions)
- [ ] Tenant dashboard — mobile view (payment card, place, mini request list)
- [ ] All `ModalIndicator` cards — tap → bottom sheet on mobile

### Phase 3 — Responsive grids
- [ ] Audit all `grid-cols-*` — add `grid-cols-1`/`grid-cols-2` mobile fallbacks
- [ ] Fix charts — `aspect` ratio mode on mobile
- [ ] Fix all `Drawer` — auto `side="bottom"` on mobile

### Phase 4 — Touch + PWA
- [ ] `touch-action: manipulation` on all interactive elements
- [ ] Minimum touch targets (44px) audit
- [ ] FAB on primary-action pages
- [ ] `manifest.webmanifest` + viewport meta tags
- [ ] Safe area inset padding on bottom nav and FAB

---

## What Never Changes on Mobile

The following are **desktop and mobile identical** — no mobile-specific variants:

- Glass card visual language (grain, matte, blur)
- Color system (primary, muted, destructive, accent tokens)
- All data hooks and business logic
- Auth, billing, Stripe flows
- Framer Motion animation tokens and durations
- Component API surface (Button, Input, Badge, Card, etc.)
- Dark/light theme behaviour

Mobile is a **presentation layer decision**, not an architecture decision.
