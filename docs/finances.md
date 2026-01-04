# Finances Page — MVP Documentation

## Overview

The Finances page provides landlords with a comprehensive view of their rental property finances, including interactive graphs, rent tracking, expense management, and financial summaries. This document outlines MVP features and post-MVP expansion paths.

## MVP Features

### Interactive Financial Graph

The financial graph is the centerpiece of the Finances page, providing visual insights into financial performance.

**Time Ranges:**
- **Month to date** (default): Current month from day 1 to today
- **Year to date (Jan 1 – Today)**: Calendar year from January 1st to today
  - MVP: Calendar year only, not fiscal year
  - Post-MVP: Support for fiscal year and rolling 12-month ranges

**Dataset Toggles:**
- Rent collected (show/hide)
- Outstanding rent (show/hide)
- Expenses (show/hide)
- Net cash flow (show/hide)

**Style Controls:**
- Line ↔ Bar chart toggle
- Smooth ↔ Sharp curves (for line charts)
- Light animation transitions

**Export Functionality:**
- **PNG Export**: Captures current graph view as image
- **CSV Export**: Exports filtered underlying data
- Exports respect:
  - Active date range
  - Active datasets
  - Current style configuration

**Fullscreen Modal:**
- Expand icon (⤢) in graph card top-right corner
- Opens fullscreen modal with same graph state
- Escape key + close button support
- Retains all filters, toggles, and styles

### Rent Summary Cards

Four clickable cards displaying key financial metrics:
- **Total Collected**: Rent payments received in current period
- **Outstanding**: Unpaid rent amounts
- **Expenses**: Total expenses in current period
- **Net Cash Flow**: Net income (income minus expenses)

Each card:
- Shows current period value
- Has modal indicator icon (⤢)
- Opens modal with filtered details when clicked
- Respects current date range and property filters

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
│   └── fullscreen-graph-modal.tsx (graph modal)
├── landlord/
│   ├── rent-summary-cards.tsx
│   ├── rent-summary-modal.tsx
│   ├── financial-graph-enhanced.tsx (replaces financial-graph-switcher)
│   ├── rent-ledger-row.tsx (enhanced with late fees)
│   └── expense-form.tsx (enhanced with editing)
└── tenant/
    ├── finance-summary-card.tsx
    └── finances-page.tsx
```

## Future Enhancements

When expanding beyond MVP, consider:

1. **Performance**: Optimize graph rendering for large datasets
2. **Accessibility**: Enhanced keyboard navigation and screen reader support
3. **Mobile**: Responsive graph controls and touch interactions
4. **Export Formats**: PDF, Excel, additional formats
5. **Collaboration**: Share financial views with accountants/collaborators
6. **Integrations**: QuickBooks, Xero, accounting software sync

