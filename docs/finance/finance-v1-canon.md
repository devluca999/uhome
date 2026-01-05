# Finance v1 Canon - Requirements & Alignment

## Overview

This document defines the Landlord Finance v1 Canon - the authoritative set of financial metrics and surfaces required for the MVP. All finance-related features must align with this canon.

## Required v1 Finance Surfaces

### Top-Level KPIs (Page-Wide, Filter-Aware)

All KPIs must:
- Respect page-wide filters (date range + property)
- Be expandable with definition, formula, and breakdown
- Be traceable to ledger entries
- Update immediately when data changes

#### 1. Total Rent Collected ✅
- **Definition**: Sum of all rent payments received (status = 'paid')
- **Formula**: `SUM(rent_records.amount + rent_records.late_fee) WHERE status = 'paid'`
- **Current Status**: ✅ Implemented as "Total Collected" in KPI strip
- **Calculation Source**: `useFinancialMetrics.rentCollected`
- **Filter Awareness**: ✅ Respects property and date filters

#### 2. Outstanding / Unpaid Rent ✅
- **Definition**: Sum of all unpaid rent (status = 'overdue')
- **Formula**: `SUM(rent_records.amount + rent_records.late_fee) WHERE status = 'overdue'`
- **Current Status**: ✅ Implemented as "Outstanding Rent" in KPI strip
- **Calculation Source**: `calculateUnpaidRent()` from `finance-calculations.ts`
- **Filter Awareness**: ✅ Respects property and date filters

#### 3. Total Expenses ✅
- **Definition**: Sum of all expenses recorded
- **Formula**: `SUM(expenses.amount)`
- **Current Status**: ✅ Implemented in KPI strip
- **Calculation Source**: `useFinancialMetrics.totalExpenses`
- **Filter Awareness**: ✅ Respects property and date filters

#### 4. Net Cash Flow ✅
- **Definition**: Rent collected minus total expenses
- **Formula**: `rentCollected - totalExpenses`
- **Current Status**: ✅ Implemented as "Net Profit" in KPI strip
- **Calculation Source**: `useFinancialMetrics.netProfit`
- **Note**: Labeled as "Net Profit" but represents Net Cash Flow per v1 canon

#### 5. Active Properties ✅
- **Definition**: Count of properties that have at least one tenant
- **Formula**: `COUNT(DISTINCT properties.id) WHERE EXISTS (SELECT 1 FROM tenants WHERE tenants.property_id = properties.id)`
- **Current Status**: ✅ Implemented as "Active Properties" in KPI strip
- **Calculation Source**: `calculateActiveProperties()` from `finance-calculations.ts`
- **Filter Awareness**: ✅ Respects property filter

#### 6. Occupancy Rate ✅
- **Definition**: Percentage of properties that are occupied (have tenants)
- **Formula**: `(COUNT(DISTINCT properties_with_tenants) / COUNT(DISTINCT properties)) * 100`
- **Current Status**: ✅ Implemented as "Occupancy Rate" in KPI strip
- **Calculation Source**: `calculateOccupancyRate()` from `finance-calculations.ts`
- **Filter Awareness**: ✅ Respects property filter

## Current KPI Strip Analysis

### Existing KPIs
1. **Total Collected** ✅ - Maps to "Total Rent Collected"
2. **Total Expenses** ✅ - Maps to "Total Expenses"
3. **Net Profit** ✅ - Maps to "Net Cash Flow"
4. **Projected Net** ⚠️ - Not in v1 canon, but useful for landlords (keep for now)

### Missing KPIs
1. **Outstanding Rent** ✅ - Added to KPI strip
2. **Active Properties** ✅ - Added to KPI strip
3. **Occupancy Rate** ✅ - Added to KPI strip

## Calculation Source Analysis

### Current Implementation
- ✅ Calculations extracted to `src/lib/finance-calculations.ts` (pure functions)
- ✅ `use-financial-metrics.ts` refactored to use centralized calculations
- ✅ All calculations are filter-aware
- ✅ All calculations are traceable to ledger entries
- ✅ Recalculation happens automatically via React hooks (useMemo dependencies)

## Filter Requirements

### Page-Wide Filters
- **Date Granularity**: Monthly, Quarterly, Yearly
- **Time Range**: Month to Date, Year to Date
- **Property**: All properties or specific property

### Filter Propagation
All filters must affect:
- ✅ KPI strip values
- ✅ Ledger entries
- ✅ Interactive graph (default scope)
- ✅ Breakdown views

### Graph-Only Overrides
- Graph may have local filter overrides
- Overrides must NOT affect KPIs or ledger
- Must provide "Reset to page filters" option

## Ledger as Verification Surface

### Current State
- Ledger includes rent records ✅
- Ledger includes expenses ✅
- Chronologically ordered ✅
- Filtered by page-wide filters ✅

### Requirements
- Ledger is the single source of truth for verification
- All KPI calculations must be traceable to ledger entries
- No new ledger types (per requirements)

## What is Included in v1

✅ **Included:**
- Rent collection tracking
- Expense tracking
- Basic financial calculations
- Filter-aware metrics
- Ledger as audit source
- Interactive graph (time-based insights)
- Expandable KPI cards with breakdowns

## What is Explicitly Excluded

❌ **Excluded (Do NOT implement):**
- Tax logic
- Depreciation
- Investment metrics
- Accounting classifications
- New database tables (unless strictly required)
- Speculative calculations

## Why Advanced Features are Deferred

- **Tax Logic**: Requires complex tax rules, jurisdiction-specific logic, and legal compliance
- **Depreciation**: Requires asset tracking, depreciation methods, and accounting standards
- **Investment Metrics**: ROI, IRR, etc. require more complex financial modeling
- **Accounting Classifications**: Requires chart of accounts, double-entry bookkeeping

These features are deferred to maintain simplicity and focus on core landlord needs: tracking income, expenses, and cash flow.

## Alignment Checklist

- [x] Add Outstanding Rent KPI card
- [x] Add Active Properties KPI card
- [x] Add Occupancy Rate KPI card
- [x] Create centralized calculation layer
- [x] Refactor useFinancialMetrics to use centralized calculations
- [x] Ensure all KPIs are expandable with definition/formula/breakdown
- [x] Verify all calculations respect filters
- [x] Verify ledger serves as audit source
- [x] Document filter precedence rules
- [x] Verify no duplicate KPIs

## Implementation Status

### Completed
1. ✅ Created centralized calculation module (`src/lib/finance-calculations.ts`)
2. ✅ Refactored `useFinancialMetrics` to use centralized calculations
3. ✅ Updated KPI strip to include all v1 canon KPIs
4. ✅ Enhanced RentSummaryModal with calculation details and scroll lock
5. ✅ Made Financial Insights Module collapsible
6. ✅ Reduced filter bar visual footprint
7. ✅ Added scroll lock to all modals (RentSummaryModal, WorkOrderExpensePrompt)
8. ✅ Documented calculation formulas and dependencies

### Current KPI Strip (v1 Canon Compliant)
1. **Total Collected** ✅ - Total Rent Collected
2. **Outstanding Rent** ✅ - Outstanding / Unpaid Rent
3. **Total Expenses** ✅ - Total Expenses
4. **Net Cash Flow** ✅ - Net Cash Flow (rent_collected - expenses)
5. **Active Properties** ✅ - Count of properties with tenants
6. **Occupancy Rate** ✅ - Percentage of properties occupied
7. **Projected Net** ⚠️ - Not in v1 canon, but useful (kept)

## Filter Precedence Rules

1. **Page-wide filters** (date range + property) are the source of truth
2. **Graph-local overrides** may diverge for exploration
3. **Graph overrides do NOT affect KPIs or ledger**
4. **Reset to page filters** option available in graph when overrides are active

## Ledger Verification

The ledger serves as the single source of truth for verification:
- ✅ Includes rent records (chronologically ordered)
- ✅ Includes expenses (chronologically ordered)
- ✅ Filtered by page-wide filters
- ✅ All KPI calculations traceable to ledger entries
- ✅ Used for CSV export
- ✅ Ledger export includes both rent and expenses in unified chronological list

## Final Validation Checklist

All items verified and complete:

- ✅ **No KPI is duplicated** - Each metric appears once in KPI strip
- ✅ **Every number can be traced to the ledger** - All calculations use ledger data
- ✅ **Filters behave predictably** - Page-wide filters affect all components, graph overrides don't mutate page state
- ✅ **UI does not feel bloated** - Filter bar is compact, collapsible sections reduce visual clutter
- ✅ **Finance surfaces align with landlord mental models** - Simple, clear metrics focused on cash flow
- ✅ **All calculations use centralized layer** - `finance-calculations.ts` is single source of truth
- ✅ **Data propagation works correctly** - Updates trigger immediate recalculation via React hooks
- ✅ **Expandable/collapsible UI is consistent** - ModalIndicator on all expandable cards, CollapsibleSection for major sections
- ✅ **Documentation is complete** - All formulas, dependencies, and exclusions documented

