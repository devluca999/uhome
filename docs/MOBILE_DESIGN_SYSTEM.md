# uhome Mobile Design System

> **Status:** Active â€” updated as mobile features ship  
> **Scope:** Web PWA (app.getuhome.app). React Native phase is post-MVP.  
> **Breakpoint:** `< 768px` (Tailwind `md`) is the mobile boundary.

---

## Core Philosophy

### Depth over scroll

Desktop shows everything simultaneously. Mobile shows **one clear at-a-glance view** and puts all detail **one tap away in a bottom sheet**. Nothing is removed â€” it is reorganised.

The landlord dashboard on desktop renders 6 metric cards, 2 charts, financial summaries, property profitability, smart insights, and an activity feed â€” all visible at once because wide screens support peripheral scanning. On a 390px phone that same content is 2,800px of scroll that users will not read.

The mobile answer is **layers, not lists**:

```
Tap metric card  â†’  Bottom sheet with full chart + breakdown
Tap property row â†’  Property detail sheet (tenants, orders, actions)
Tap work order   â†’  Order detail + status update controls
Tap insight pill â†’  Expanded insight + recommended action
```

The rule: **if it requires scrolling to reach on mobile, it belongs in a sheet.**

### Preserve the aesthetic â€” tighten the density

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
| Grid columns | 3â€“4 col | 2 col max |
| Chart height | 300px fixed | `aspect-ratio: 4/3` |

---

## Navigation Architecture

### Desktop (â‰¥ 768px) â€” header nav (unchanged)

Full horizontal nav bar with all items visible. No changes.

### Mobile (< 768px) â€” bottom tab bar

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  uhome              ðŸ””   â˜€      â”‚  â† MobileTopBar (h-14)
â”‚â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”‚
â”‚                                 â”‚
â”‚         Page content            â”‚
â”‚         pb-20 (clears nav)      â”‚
â”‚                                 â”‚
â”‚â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”‚
â”‚  ðŸ        ðŸ’°       âŠž      âš™    Â·Â·Â·  â”‚  â† MobileBottomNav
â”‚ Home  Finances  Props  Ops  More â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Landlord tabs:**

| Tab | Route | Icon |
|---|---|---|
| Home | `/landlord/dashboard` | House |
| Finances | `/landlord/finances` | Currency |
| Properties | `/landlord/properties` | Grid |
| Operations | `/landlord/operations` | Wrench |
| More | Sheet â†’ Documents, Messages, Settings, Notifications | Ellipsis |

**Tenant tabs:**

| Tab | Route | Icon |
|---|---|---|
| Home | `/tenant/dashboard` | House |
| Finances | `/tenant/finances` | Currency |
| Issues | `/tenant/maintenance` | Wrench |
| Messages | `/tenant/messages` | Chat |
| More | Sheet â†’ Documents, Notifications, Settings | Ellipsis |

### MobileTopBar

- Height: `h-14` (56px)
- Left: logo + wordmark
- Right: notification bell + theme toggle
- No nav items â€” those live in the bottom bar
- Same `glass-nav` styling as desktop

### MobileBottomNav

- Fixed to bottom, `z-50`
- Background: `bg-background/95 backdrop-blur-md`
- `padding-bottom: env(safe-area-inset-bottom, 12px)` â€” iPhone home bar clearance
- Active item: filled icon + coloured label + 4px dot indicator below label
- Inactive: muted icon + muted label, `hover:text-foreground` on pointer devices

---

## Bottom Sheet Pattern

Bottom sheets are the **detail layer** on mobile. They replace inter-page navigation for contextual data.

### When to use a bottom sheet (not page navigation)

- Metric card tapped â†’ breakdown sheet with chart + line items
- Property row tapped â†’ property detail (tenants, orders, quick actions)
- Work order tapped â†’ order detail + status dropdown
- Tenant row tapped â†’ tenant detail + contact actions
- Smart insight tapped â†’ full insight + recommended action button
- Create forms (property, work order, maintenance request) â†’ full-height sheet

### When to use page navigation (not a sheet)

- Bottom tab switch (always full page swap)
- Settings (full page â€” needs full scroll depth)
- Finances (full page â€” complex charts need full width)
- Documents (full page â€” file browser needs persistent state)

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
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ April 2026                      â”‚
â”‚ $12,400          â† hero number  â”‚
â”‚ collected this month            â”‚
â”‚â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”‚
â”‚ 96% collection â”‚ $480 owed â”‚ 8  â”‚  â† summary bar (3 cols)
â”‚â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”‚
â”‚ Net income $9,240    tap â†’      â”‚  â† single full-width card
â”‚â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”‚
â”‚  Work orders 3  â”‚  Occupancy 7/8 â”‚  â† 2-col metric cards
â”‚â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”‚
â”‚ Quick actions                   â”‚
â”‚ [Log rent] [Work order] [Invite]â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Rules:**
- Max 3 metric cards visible (no scroll to see metrics)
- Charts live in sheets only (tap metric â†’ sheet with chart)
- Quick actions are 3 equal-width ghost buttons
- No financial summary section, no property profitability, no insights grid â€” all accessible via sheets

### Tenant Home (mobile)

Tenant dashboard is intentionally simpler. Tenants have one property, one rent status, a few requests. The mobile view should feel calm, not data-heavy.

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Hey Jane ðŸ‘‹                     â”‚
â”‚â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”‚
â”‚ $1,800 due May 1                â”‚  â† PaymentCard (prominent)
â”‚ [Pay now]                       â”‚
â”‚â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”‚
â”‚ Your place                      â”‚
â”‚ Sunrise Apts 3B Â· 42 Oak St  â†’  â”‚
â”‚â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”‚
â”‚ Maintenance (2 open)            â”‚
â”‚ â€¢ HVAC heating    [Scheduled]   â”‚
â”‚ â€¢ Faucet repair   [Done]        â”‚
â”‚â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”‚
â”‚ [Request] [Message] [Documents] â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

No charts needed on tenant mobile. The rent status, place info, and open requests are the entire job-to-be-done.

---

## Grid Responsiveness

All grids must collapse correctly. Standard pattern:

```tsx
// Metric cards (3â€“4 col desktop)
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
- Charts in sheets get full `90vw` width â€” no cramping

---

## Forms and Modals on Mobile

All create/edit forms switch to **full-height bottom sheets** on mobile:

```tsx
// In drawer.tsx â€” auto-switch side on mobile
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

- All tappable elements: minimum `44px Ã— 44px` (Apple HIG standard)
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

### Phase 1 â€” Navigation (unblocks everything)
- [ ] `useIsMobile` hook (`window.innerWidth < 768` + resize listener)
- [ ] `MobileTopBar` component
- [ ] `MobileBottomNav` component (landlord + tenant variants)
- [ ] Update `landlord-layout.tsx` â€” render mobile layout when `isMobile`
- [ ] Update `tenant-layout.tsx` â€” render mobile layout when `isMobile`
- [ ] Admin layout â€” hamburger + slide-over drawer on mobile

### Phase 2 â€” Dashboard restructure
- [ ] Landlord dashboard â€” mobile view (summary bar, 3 metric cards, quick actions)
- [ ] Tenant dashboard â€” mobile view (payment card, place, mini request list)
- [ ] All `ModalIndicator` cards â€” tap â†’ bottom sheet on mobile

### Phase 3 â€” Responsive grids
- [ ] Audit all `grid-cols-*` â€” add `grid-cols-1`/`grid-cols-2` mobile fallbacks
- [ ] Fix charts â€” `aspect` ratio mode on mobile
- [ ] Fix all `Drawer` â€” auto `side="bottom"` on mobile

### Phase 4 â€” Touch + PWA
- [ ] `touch-action: manipulation` on all interactive elements
- [ ] Minimum touch targets (44px) audit
- [ ] FAB on primary-action pages
- [ ] `manifest.webmanifest` + viewport meta tags
- [ ] Safe area inset padding on bottom nav and FAB

---

## What Never Changes on Mobile

The following are **desktop and mobile identical** â€” no mobile-specific variants:

- Glass card visual language (grain, matte, blur)
- Color system (primary, muted, destructive, accent tokens)
- All data hooks and business logic
- Auth, billing, Stripe flows
- Framer Motion animation tokens and durations
- Component API surface (Button, Input, Badge, Card, etc.)
- Dark/light theme behaviour

Mobile is a **presentation layer decision**, not an architecture decision.


