# Finances Page — MVP Documentation

## Overview

The Finances page provides landlords with a comprehensive view of their rental property finances, including interactive graphs, rent tracking, expense management, and financial summaries. This document outlines MVP features and post-MVP expansion paths.

**V1 Canon Alignment:** This page now fully aligns with the Landlord Finance v1 Canon. See `/docs/finance/finance-v1-canon.md` for detailed requirements and implementation status.

## MVP Features

### Page-Level Filter Bar (Authoritative Scope)

The filter bar controls all financial data on the page, placed directly below the KPI strip at the very top of the page.

**Placement:** Directly below the Global KPI Strip, before any other content.

**Filters:**
- **Date Granularity**: Monthly, Quarterly, Yearly
- **Time Range**: Month to date, Year to date (Jan 1 – Today), All Time, Custom Range
- **Property**: All properties or specific property

**Behavior:**
- **Page-wide filters define the base scope** for all financial data on the page
- Filters update: Financial Insights module, Rent Ledger, Expense Table
- Filters are owned by the page, not individual components
- Shared state ensures consistency across all financial views
- Example: Quarterly + Pine Oak Drive → all financial data reflects quarterly data for Pine Oak Drive

**Filter Hierarchy:**
- Page-wide filters are the source of truth
- Graph may have local-only filter overrides (scoped to graph only)
- Graph provides "Reset to page filters" option when local overrides are active

### Financial Insights Module

Unified component combining Chart and Timeline views for comprehensive financial analysis.

**View Modes:**
- **Chart View** (default):
  - **Graph Type**: Line, Bar, Area, Pie (controlled via pill + dropdown, not simple toggles)
  - Current graph type displayed as pill indicator
  - Dropdown for switching graph types
  - Dataset toggles: Rent collected, Outstanding rent, Expenses, Net cash flow
  - Export: PNG (visual), CSV (data)
  - Smooth/Sharp curves (for line/area charts)
  - **Local Filter Overrides** (optional): Graph may have local-only filters that override page-wide filters within the graph only. 
    - Local property filter: Override page property filter for graph view only
    - Local time range filter: Override page time range filter for graph view only
    - "Reset" button appears when local overrides are active
    - Local overrides do NOT affect other page data (Rent Ledger, Expense Table)
    - Page-wide filters remain the source of truth
- **Timeline View**:
  - Chronological list of events:
    - Rent paid
    - Rent due/overdue
    - Late fees applied
    - Expenses added
    - Work orders (if applicable)
  - Shows: Past events, Current day, Upcoming near-term events
  - Same filters as chart view

**Full-Screen Expansion:**
- Expand icon (⤢) opens **true full-screen analytics view** (not a modal overlay)
- Graph occupies full viewport width and height
- Background page scroll is disabled (body scroll lock)
- Supports both Chart (Line, Bar, Area, Pie) and Timeline views
- Retains all filters, graph type, datasets, and state
- Graph type controlled via pill + dropdown in full-screen mode
- Close via close icon or Escape key
- This is an "analysis mode," not navigation

### Manual Late Fee Handling

**MVP Implementation:**
- Late fees are manually applied (no automation)
- Stored as separate `late_fee` field in `rent_records` table
- Total due = rent amount + late fee
- Late fee can be applied/edited for overdue records
- System may suggest late fee when rent is overdue, but application is manual

**Post-MVP:**
- Automated late fee rules (percentage, flat fee, grace period)
- Automatic calculation based on days overdue
- Late fee templates and presets

### Editable Expenses

Expense records can be edited after creation.

**Editable Fields:**
- Amount
- Category
- Date
- Property / unit
- Notes (via notes system)

**Editing Behavior:**
- Opens modal form
- Shows original vs updated values
- Optional "Reason for change" input (MVP: stored in notes, no audit trail)
- No hard locks in MVP

**Post-MVP:**
- Audit trail with change history
- Record locking for reconciled expenses
- Approval workflows

### Tenant Read-Only Finance Views

Tenants have access to their financial information in read-only mode.

**Tenant Dashboard Summary:**
- Current balance (outstanding + pending)
- Due date (next pending payment)
- Last payment date
- CTA: "View payment history"

**Tenant Finances Page (`/tenant/finances`):**
- Full payment history (read-only)
- Late fees (read-only, displayed but not editable)
- Receipts download
- Notes (read-only)

**Access Control:**
- Tenants can only view their own records
- No edit capabilities for financial data
- Read-only access enforced at database level (RLS)

## Post-MVP / Pro Features (Do Not Implement)

The following features are documented for future expansion but are **not** part of the MVP:

### Automated Late Fee Rules
- Configurable late fee percentages
- Flat fee options
- Grace period settings
- Automatic calculation and application

### Advanced Time Ranges
- Rolling 12-month view
- Fiscal year support (configurable start date)
- Custom date range picker
- Comparison periods (this month vs last month)

### Bank Account Sync
- Plaid integration
- Automatic transaction import
- Bank reconciliation
- Multi-account support

### AI-Generated Summaries
- "What changed this month?" summaries
- Anomaly detection
- Trend analysis
- Predictive insights

### Cash-Flow Projections
- 30/60/90-day projections
- Scenario planning
- What-if analysis
- Budget vs actual comparisons

### Missed Revenue Detection
- Vacancy loss tracking
- Unapplied late fees detection
- Payment pattern analysis
- Revenue optimization suggestions

### White-Labeled Financial Statements
- Customizable statement templates
- Branded PDF exports
- Professional formatting
- Multi-property statements

### Advanced Tax-Ready Exports
- Schedule E format
- 1099 preparation
- Depreciation tracking
- Tax category mapping

## Design Principles

The Finances page follows these design principles:

1. **Clarity over Complexity**: Optimize for clarity over accounting depth
2. **Avoid QuickBooks-Style UI**: Keep interface clean and approachable
3. **10-Second Answers**: Page must answer in under 10 seconds:
   - Am I making money?
   - Who hasn't paid?
   - What changed?
   - What should I worry about?
4. **Confidence-Building UI**: Clean, readable patterns that build trust

## Technical Implementation Notes

### MVP-Only Comments

Inline comments mark MVP-only logic throughout the codebase:

- `src/components/landlord/financial-graph-enhanced.tsx`: YTD calculation (calendar year, not fiscal)
- `src/components/landlord/rent-ledger-row.tsx`: Manual late fee application (no automation)
- `src/components/landlord/expense-form.tsx`: Edit mode (no audit trail)
- `src/hooks/use-financial-metrics.ts`: Calendar year YTD (not fiscal)

### Database Schema

- `rent_records.late_fee`: `NUMERIC(10, 2) DEFAULT 0 NOT NULL`
  - MVP: Manually applied, no automation
  - Migration: `supabase/migrations/add_late_fee_to_rent_records.sql`

### Component Architecture

```
src/components/
├── ui/
│   ├── modal-indicator.tsx (reusable expand icon)
│   ├── collapsible-section.tsx (global collapsible pattern)
│   └── fullscreen-graph-modal.tsx (graph modal)
├── landlord/
│   ├── finances-filter-bar.tsx (page-level filters)
│   ├── financial-insights-module.tsx (unified chart + timeline)
│   ├── finances-onboarding.tsx (lightweight tooltips)
│   ├── rent-ledger-row.tsx (enhanced with late fees)
│   └── expense-form.tsx (enhanced with editing, original vs updated)
└── tenant/
    ├── finance-summary-card.tsx
    └── finances-page.tsx
```

### Page Layout Hierarchy

1. **Global KPI Strip** (sticky, unchanged)
2. **Page-Level Filter Bar** (new, below KPI strip)
3. **Financial Insights Module** (unified graph + timeline)
4. **Rent Ledger** (collapsible section)
5. **Expense Table** (collapsible section)

### Collapsible Sections

Both Rent Ledger and Expense Table are collapsible:
- Default: Expanded
- Collapse state persisted in localStorage
- Critical alerts remain visible when collapsed
- Chevron indicator in front of section header

## Future Enhancements

When expanding beyond MVP, consider:

1. **Performance**: Optimize graph rendering for large datasets
2. **Accessibility**: Enhanced keyboard navigation and screen reader support
3. **Mobile**: Responsive graph controls and touch interactions
4. **Export Formats**: PDF, Excel, additional formats
5. **Collaboration**: Share financial views with accountants/collaborators
6. **Integrations**: QuickBooks, Xero, accounting software sync

