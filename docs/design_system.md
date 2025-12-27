# Design System — haume

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

## Usage Examples

See `docs/ui_conventions.md` for component-specific patterns and usage guidelines.

