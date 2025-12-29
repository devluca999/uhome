# UI Conventions — uhome

## Component System

**Primary System: shadcn/ui**
- Built on Radix UI primitives (accessible, unstyled)
- Copy-paste components (full customization control)
- Tailwind-first styling
- TypeScript support
- Component location: `src/components/ui/`

## Component Strategy

### shadcn/ui Primitives (Use Directly)

**Form & Input:**
- `button` - All buttons (variants: primary, secondary, ghost, outline)
- `input` - Text inputs, form fields
- `label` - Form labels
- `select` - Dropdowns
- `textarea` - Multi-line text input
- `checkbox` - Checkboxes
- `radio-group` - Radio buttons
- `switch` - Toggle switches

**Layout & Containers:**
- `card` - Base for glassmorphic surfaces (customized)
- `separator` - Visual dividers
- `tabs` - Tab navigation
- `sheet` - Side panels/drawers
- `dialog` - Modals

**Feedback:**
- `toast` - Notifications (via sonner)
- `alert` - Alert messages
- `badge` - Status badges

**Navigation:**
- `dropdown-menu` - Context menus
- `navigation-menu` - Main navigation

**Data Display:**
- `table` - Data tables
- `avatar` - User avatars
- `skeleton` - Loading states

### Custom Components (Built on shadcn/ui)

**Glassmorphic Surfaces:**
- `GlassCard` - Enhanced card with glassmorphic styling
- `GlassPanel` - Sidebar/panel with glass effect

**Property Management Specific:**
- `PropertyCard` - Property listing card
- `TenantCard` - Tenant profile card
- `MaintenanceRequestCard` - Maintenance request card
- `RentStatusBadge` - Custom rent status indicator (hue-based)

**Dashboard Components:**
- `DashboardStat` - Stat card with value + label
- `DashboardChart` - Simple chart wrapper (if needed)

**Layout Components:**
- `LandlordNav` - Landlord navigation bar
- `TenantNav` - Tenant navigation bar
- `RoleBasedSidebar` - Role-specific sidebar

**Status Indicators:**
- `StatusGlow` - Hue-based status indicator (not label-based)
- `AmbientIndicator` - Subtle state communication

## Component Hierarchy

```
shadcn/ui primitives (src/components/ui/)
  ↓
Custom business components (src/components/landlord/, src/components/tenant/)
  ↓
Page components (src/pages/)
```

## Naming Conventions

**Components:**
- PascalCase for component files: `Button.tsx`, `PropertyCard.tsx`
- Export named components (not default)
- Lowercase with hyphens for route files: `dashboard.tsx`

**Structure:**
- Use TypeScript interfaces for props
- Place in appropriate folder (ui/, landlord/, tenant/, layout/)

## Styling Conventions

**Tailwind-first:**
- No CSS modules
- Use `cn()` utility for conditional classes
- Follow shadcn/ui patterns for variants
- Glassmorphic effects via Tailwind utilities

**Props:**
- Extend shadcn/ui component props (e.g., `React.ComponentProps<typeof Button>`)
- Use variant props for styling variations
- Keep props explicit and typed

## How to Add shadcn/ui Components

1. Run: `npx shadcn@latest add [component-name]`
2. Component is added to `src/components/ui/`
3. Customize as needed for uhome's design system

