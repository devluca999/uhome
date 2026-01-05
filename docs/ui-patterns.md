# UI Patterns — Global Conventions

This document outlines global UI patterns and conventions used across the uhome application.

## Expand Icon Pattern (Modal Indicator)

**Purpose:** Visually communicate that a card or component opens a modal or full-screen view when clicked.

**Implementation:**
- Use `ModalIndicator` component from `@/components/ui/modal-indicator`
- Place in **top-right corner** of card (absolute positioning)
- Shows expand icon (⤢ / Maximize2) with hover effects
- Tooltip: "Expand"

**Usage Rules:**
- Only add to cards/components that open modals or full-screen views
- Do not clutter non-interactive cards
- Hover increases opacity (60% → 100%) and shows tooltip
- Clicking icon or card opens the modal/full-screen view
- Must never overlap titles, buttons, or status icons

**Scope:**
- Dashboard cards that open modals (Monthly Revenue, Net Profit, Total Expenses, Recent Activity)
- Analytics components (Financial Insights Module, Financial Graph Enhanced)
- Full-screen views
- Any card/component that opens a modal or full-screen view

**Audit Status:**
- ✅ Dashboard: Monthly Revenue, Net Profit, Total Expenses, Recent Activity cards
- ✅ Financial Insights Module
- ✅ Financial Graph Enhanced (legacy component, still used in some contexts)
- ✅ All modals use scroll lock (`useModalScrollLock` hook)

**Example:**
```tsx
<Card className="relative">
  <ModalIndicator onClick={() => setShowFullscreen(true)} />
  {/* Card content */}
</Card>
```

**Documentation:** See `src/components/ui/modal-indicator.tsx` for implementation details.

## Full-Screen Analytics Behavior

**Purpose:** Provide deeper analysis without adding clutter to MVP screens. This is not a modal overlay—it's a true full-screen "analysis mode."

**Behavior:**
- Expand icon (⤢) opens full-screen analytics view
- Graph occupies full viewport width and height
- Background page scroll is disabled (body scroll lock)
- Retains all filters, view modes, and state
- Supports Chart (Line, Bar, Area, Pie) and Timeline views
- Graph type controlled via pill + dropdown (not simple toggles)
- Close via close icon or Escape key
- Smooth animation using existing motion tokens

**Implementation:**
- Use `FullscreenGraphModal` component
- State is lifted to parent component
- All controls and filters remain accessible in full-screen mode
- Uses `useModalScrollLock` hook to prevent background scrolling

**Graph Type Controls:**
- Display current graph type as a pill indicator
- Dropdown for switching between: Line, Bar, Area, Pie
- Dropdown closes on selection or outside click
- Graph type controls do not conflict with expand icon placement

## Collapsible Sections Pattern

**Purpose:** Allow users to focus on specific sections by collapsing others, with state persistence.

**UI Pattern:**
- Collapsible indicator (ChevronDown/ChevronUp) placed **in front of** section header
- Clicking the indicator or header toggles collapse state
- Smooth animation using existing motion tokens
- Default: Expanded
- Collapse state persisted in localStorage (keyed by unique section ID)

**Component:**
- Use `CollapsibleSection` component from `@/components/ui/collapsible-section`
- Unique ID required for localStorage key
- Critical alerts remain visible even when collapsed

**Usage:**
```tsx
<CollapsibleSection
  id="rent-ledger" // Unique ID for localStorage key
  title="Rent Ledger"
  defaultExpanded={true}
  showCriticalAlerts={true} // Keep alerts visible when collapsed
>
  {/* Section content */}
</CollapsibleSection>
```

**Pages Using Collapsible Sections:**
- Finances Page: Rent Ledger, Expense Table
- Dashboard Page: Recent Activity, Smart Insights
- Other pages with collapsible-worthy sections

**Behavior:**
- Default: Expanded
- Collapse state persisted in localStorage (key: `collapsible-section-{id}`)
- Critical alerts remain visible even when collapsed
- Smooth animation using existing motion tokens
- Chevron rotates/transforms on toggle

## Global UI Conventions

### Component Hierarchy
```
shadcn/ui primitives (src/components/ui/)
  ↓
Custom business components (src/components/landlord/, src/components/tenant/)
  ↓
Page components (src/pages/)
```

### Naming Conventions
- **Components:** PascalCase for component files: `Button.tsx`, `PropertyCard.tsx`
- **Routes:** Lowercase with hyphens for route files: `dashboard.tsx`
- **Export:** Named components (not default)

### Styling Conventions
- **Tailwind-first:** No CSS modules, use `cn()` utility for conditional classes
- **Follow shadcn/ui patterns** for variants
- **Glassmorphic effects** via Tailwind utilities

### Motion & Animation
- Use existing motion tokens from `@/lib/motion`
- Respect `prefers-reduced-motion`
- Smooth transitions for state changes
- Duration: 150-250ms for most interactions

## Modal Scroll Lock Behavior

**Purpose:** Prevent background page scrolling when modals or full-screen views are open.

**Implementation:**
- Use `useModalScrollLock` hook from `@/hooks/use-modal-scroll-lock`
- Automatically locks body scroll when modal is open
- Restores scroll position on modal close
- Applied to all modals: `BreakdownModal`, `FullscreenGraphModal`, `Drawer`, etc.

**Behavior:**
- Body scroll is disabled when modal is open
- Scroll position is preserved and restored on close
- Modal content can scroll independently (if needed)
- Prevents visual clipping and scroll conflicts

## Global Navigation Scroll Reset

**Purpose:** Ensure consistent user experience when navigating between pages.

**Behavior:**
- On route/tab change, scroll position resets to top (Y = 0)
- Applied globally via `useScrollReset` hook in layout components
- Prevents random mid-page landings when navigating

**Implementation:**
- `useScrollReset` hook in `LandlordLayout` and `TenantLayout`
- Automatically resets scroll on `location.pathname` change
- No user action required—automatic on route change

