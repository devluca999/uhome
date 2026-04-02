# Design System — uhome

## Design Tokens

### Colors

**Base Palette:**
- **Warm Whites:** 
  - Background: `#FAFAF9`
  - Pure white: `#FFFFFF`
- **Soft Grays:** 
  - Surface: `#F5F5F4`
  - Border: `#E7E5E4`
  - Text secondary: `#78716C`
  - Text primary: `#292524`

**Accent Hue:** 
- Sage green: `#84A98C` (primary)
- Alternative: Slate `#64748B` (to be finalized based on Lovable UI reference)

**Semantic Colors (via hue shifts):**
- Success: Accent hue + lighter tint
- Warning: Accent hue + warm shift
- Error: Accent hue + red shift
- Info: Accent hue + blue shift

**Glassmorphic:**
- Glass background: `rgba(255, 255, 255, 0.1)` (light) / `rgba(255, 255, 255, 0.05)` (subtle)
- Glass border: `rgba(255, 255, 255, 0.2)`
- Backdrop: `backdrop-blur-md` (12px) or `backdrop-blur-lg` (16px)

### Border Radius

- **Small:** `6px` - buttons, small elements
- **Medium:** `12px` - cards, inputs, default
- **Large:** `16px` - panels, large surfaces
- **Full:** `9999px` - pills, avatars

### Shadows

**Elevation Levels:**
- **Subtle:** `shadow-sm` (0 1px 2px rgba(0,0,0,0.05))
- **Default:** `shadow-md` (0 4px 6px rgba(0,0,0,0.07))
- **Elevated:** `shadow-lg` (0 10px 15px rgba(0,0,0,0.1))
- **Floating:** `shadow-xl` (0 20px 25px rgba(0,0,0,0.1))

**Glassmorphic Enhancement:**
- Inner shadow: `shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]`

### Motion

**Durations:**
- **Fast:** `150ms` - hover states, quick feedback
- **Default:** `200ms` - most transitions
- **Gentle:** `250ms` - panel opens, modals

**Easing:**
- **Default:** `ease-out` (cubic-bezier(0, 0, 0.2, 1))
- **Gentle:** `ease-in-out` (cubic-bezier(0.4, 0, 0.2, 1))

**Transitions:**
- Standard: `transition-all duration-200 ease-out`
- Color: `transition-colors duration-200 ease-out`
- Transform: `transition-transform duration-200 ease-out`

### Typography

**Font Stack:**
- Primary: System font stack or Inter/Sans-serif
- Weights: 400 (regular), 500 (medium), 600 (semibold)
- Sizes: Tailwind defaults (text-sm, text-base, text-lg, etc.)

### Spacing

- Use Tailwind spacing scale (4px base)
- Glassmorphic gaps: `gap-4` to `gap-6` (16px-24px)

## Component Patterns

### Glassmorphic Cards

```tsx
// Base pattern for glassmorphic surfaces
className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg shadow-lg"
```

### Status Indicators

Use hue-based color shifts, not labels:
- Success: Green tint
- Warning: Amber/yellow tint
- Error: Red tint
- Info: Blue tint

Avoid explicit "Success" or "Error" text labels when possible.

### Microinteractions

- Hover: Subtle elevation change (shadow increase)
- Focus: Gentle glow effect
- Active: Slight scale or depth change
- All within 150-250ms transition window

## Landing Page Alignment

The marketing site (`getuhome.app`, repo: `uhome-landing-page`) must feel like it belongs to the same product as the app. Users moving from landing page to signup should not experience a visual context switch.

### Current gaps (April 2026)

| Property | App | Landing page | Status |
|---|---|---|---|
| Typeface | Geist | Inter + DM Serif Display | ❌ Misaligned |
| Primary accent | `hsl(215 15% 55%)` slate/steel | `hsl(152 25% 42%)` sage green | ❌ Misaligned |
| Background | Near-black `#14171C` (dark-first) | Warm off-white (light-first) | Intentional — landing stays light |
| Grain texture | SVG noise overlay, `mix-blend-mode: overlay` | SVG noise overlay (same approach) | ✓ Aligned |
| Glass cards | `rgba(46,50,57,0.75)` + white 1px border + inset highlight | Light glass variant exists but different palette | ❌ Misaligned |
| App screenshots | Live app | None | ❌ Missing |

### Target state

The landing page should be the light-mode face of the same design language. It does not need to be dark — the warm off-white editorial aesthetic is intentional for marketing. What it needs:

- **Same typeface:** Geist replaces Inter. Landing page keeps DM Serif Display for editorial headings (large hero text) — this is appropriate for a landing page. Body and UI elements switch to Geist.
- **Same accent colour:** slate/steel `hsl(215 15% 55%)` replaces sage green on all buttons, CTAs, and interactive elements.
- **Same glass-card language:** Feature cards, pricing cards, and the "Who it's for" section should use the light-mode glass-card variant — `rgba(255,255,255,0.72)`, white border, inset highlight — matching `light .glass-card` in the app.
- **Product screenshots:** Real app screenshots (populated demo state) inside browser chrome mockup frames, placed at: hero scroll section (dashboard), "For Landlords" section (properties + rent tracking), pricing section (what Starter looks like), tenant section (tenant dashboard).

### Implementation sequence

1. Token alignment + Geist + glass cards (Cursor, ~2 hrs) — no dependencies
2. Fix Sprint 2 item A (demo populated state) — screenshots depend on this
3. Take screenshots of populated demo from `app.getuhome.app`
4. Add screenshots to landing page sections (Cursor, ~2 hrs)

See `LAUNCH_SPRINT_CHECKLIST.md` item 32 for the full spec.

