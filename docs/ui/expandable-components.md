# Expandable Components Pattern

## Overview

This document describes the global pattern for expandable components across the uhome application, ensuring consistent UI and behavior.

## Modal Indicator Pattern

**Component:** `src/components/ui/modal-indicator.tsx`

**Purpose:** Visually communicate that a card or component opens a modal or full-screen view when clicked.

### Implementation

- Use `ModalIndicator` component from `@/components/ui/modal-indicator`
- Place in **top-right corner** of card (absolute positioning: `top-3 right-3`)
- Shows expand icon (⤢ / Maximize2) with hover effects
- Tooltip: "Expand"

### Usage Rules

- Only add to cards/components that open modals or full-screen views
- Do not clutter non-interactive cards
- Hover increases opacity (60% → 100%) and shows tooltip
- Clicking icon or card opens the modal/full-screen view
- Must never overlap titles, buttons, or status icons
- Add padding to CardHeader if needed to avoid overlap (e.g., `pr-12`)

### Scope

- ✅ Dashboard cards that open modals (Monthly Revenue, Net Profit, Total Expenses, Recent Activity)
- ✅ KPI strip cards (all expandable)
- ✅ Financial Insights Module
- ✅ Full-screen views

### Example

```tsx
<Card className="relative">
  <ModalIndicator onClick={() => setShowFullscreen(true)} />
  <CardHeader className="pr-12"> {/* Add padding to avoid overlap */}
    <CardTitle>Financial Insights</CardTitle>
  </CardHeader>
  {/* Card content */}
</Card>
```

## Collapsible Sections Pattern

**Component:** `src/components/ui/collapsible-section.tsx`

**Purpose:** Allow major sections to collapse like drawers, with state persistence.

### Implementation

- Use `CollapsibleSection` component from `@/components/ui/collapsible-section`
- Provide unique `id` for localStorage persistence
- Default to expanded (`defaultExpanded={true}`)
- Collapse state persisted in localStorage (key: `collapsible-section-{id}`)

### Usage

```tsx
<CollapsibleSection
  id="financial-insights"
  title="Financial Insights"
  defaultExpanded={true}
  className="mb-8"
>
  {/* Section content */}
</CollapsibleSection>
```

### Behavior

- Chevron icon rotates on toggle
- Smooth animation using motion tokens
- State persists across page reloads
- Critical alerts remain visible when collapsed (if `showCriticalAlerts={true}`)

### Current Usage

- ✅ Rent Ledger section
- ✅ Expenses section
- ✅ Financial Insights Module
- ✅ Dashboard sections (Smart Insights, Recent Activity)

## Modal Scroll Lock

**Hook:** `src/hooks/use-modal-scroll-lock.ts`

**Purpose:** Prevent background page scrolling when modals are open.

### Implementation

```tsx
import { useModalScrollLock } from '@/hooks/use-modal-scroll-lock'

export function MyModal({ isOpen, onClose }) {
  useModalScrollLock(isOpen)
  // ... modal content
}
```

### Behavior

- Locks body scroll when modal is open
- Preserves scroll position
- Restores scroll position on modal close
- Modal content can scroll independently

### Modals Using Scroll Lock

- ✅ RentSummaryModal
- ✅ BreakdownModal
- ✅ FullscreenGraphModal
- ✅ Drawer
- ✅ WorkOrderExpensePrompt

## Expandable KPI Cards

**Component:** `src/components/landlord/kpi-strip.tsx`

All KPI cards are expandable and show:
- Definition
- Formula
- Breakdown by property (if applicable)

**Implementation:**
- Cards have `ModalIndicator` icon
- Clicking card or icon opens `RentSummaryModal`
- Modal shows calculation explanation and detailed breakdown

## Full-Screen Analytics Behavior

**Purpose:** Provide deeper analysis without adding clutter to MVP screens.

**Behavior:**
- Expand icon (⤢) opens full-screen analytics view
- Graph occupies full viewport width and height
- Background page scroll is disabled (body scroll lock)
- Retains all filters, view modes, and state
- Escape key or close button exits fullscreen
- This is NOT a modal overlay—it's a true full-screen "analysis mode"

## Accessibility

- All expandable components support keyboard navigation
- Expand icons have proper ARIA labels
- Collapsible sections have `aria-expanded` and `aria-controls` attributes
- Focus management handled correctly in modals

