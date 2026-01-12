# Finance Calculations

## Source of Truth

**`src/lib/finance-calculations.ts`** is the single source of truth for all financial calculations in the application.

All screens MUST import from this module or use hooks that call these functions. No screen should recompute sums independently.

**E2E Testing:**

Financial assertion tests (`tests/e2e/financial/*.spec.ts`) validate that UI displays match database calculations:

- Uses `tests/helpers/financial-assertions.ts` to query database (read-only) and compute expected values
- Compares expected values against UI displays
- Ensures mathematical correctness and consistency across all app surfaces

See `docs/testing/staging-only.md` for more information about financial assertion tests.

--- Documentation

## Source of Truth

**`src/lib/finance-calculations.ts`** is the single source of truth for all financial calculations.

All screens MUST import from this module or call the same endpoint. No screen should recompute sums independently.

## Financial Assertion Tests

E2E tests validate that UI displays match database calculations:

- **`tests/helpers/financial-assertions.ts`** - Reusable helper that queries database (read-only) and computes expected financial values using the same logic as `finance-calculations.ts`

- **`tests/e2e/financial/dashboard-math.spec.ts`** - Validates dashboard calculations match expected values
- **`tests/e2e/financial/finances-filters.spec.ts`** - Validates filter calculations (Month, Quarter, Year, Custom range)
- **`tests/e2e/financial/cross-screen-consistency.spec.ts`** - Ensures same numbers appear everywhere
- **`tests/e2e/financial/work-order-costs.spec.ts`** - Validates work order cost propagation
- **`tests/e2e/financial/edge-cases.spec.ts`** - Tests edge cases (zero income, NaN handling, etc.)
- **`tests/visual/financial-numeric-lockstep.spec.ts`** - Visual + numeric validation

These tests ensure mathematical correctness and consistency across all app surfaces.

## Calculation Functions

## Overview

This document describes the centralized finance calculation layer and all calculation formulas used in the Finance v1 Canon.

## Calculation Module

**Location:** `src/lib/finance-calculations.ts`

All calculations are pure functions with no side effects. They accept filter parameters and return calculated values that are traceable to ledger entries.

## Core Calculations

### 1. Total Rent Collected

**Function:** `calculateRentCollected(rentRecords, filters?)`

**Formula:**
```
SUM(amount + late_fee) WHERE status = 'paid'
```

**Filters:**
- `propertyId`: Filter by specific property
- `dateRange`: Filter by date range (uses paid_date for paid records)

**Notes:**
- Includes late fees in calculation (MVP requirement)
- Uses `paid_date` for date filtering on paid records
- Returns 0 if no paid records match filters

### 2. Outstanding / Unpaid Rent

**Function:** `calculateUnpaidRent(rentRecords, filters?)`

**Formula:**
```
SUM(amount + late_fee) WHERE status = 'overdue'
```

**Filters:**
- `propertyId`: Filter by specific property
- `dateRange`: Filter by date range (uses due_date for overdue records)

**Notes:**
- Includes late fees in calculation (MVP requirement)
- Uses `due_date` for date filtering on overdue records
- Returns 0 if no overdue records match filters

### 3. Total Expenses

**Function:** `calculateTotalExpenses(expenses, filters?)`

**Formula:**
```
SUM(amount)
```

**Filters:**
- `propertyId`: Filter by specific property
- `dateRange`: Filter by date range (uses expense.date)

**Notes:**
- Simple sum of all expense amounts
- No categorization or grouping
- Returns 0 if no expenses match filters

### 4. Net Cash Flow

**Function:** `calculateNetCashFlow(rentCollected, totalExpenses)`

**Formula:**
```
rentCollected - totalExpenses
```

**Notes:**
- Primary profitability metric for v1 canon
- Can be negative (expenses exceed income)
- Pure calculation - no filtering (uses pre-filtered values)

### 5. Active Properties

**Function:** `calculateActiveProperties(properties, tenants, filters?)`

**Formula:**
```
COUNT(DISTINCT properties.id) WHERE EXISTS (SELECT 1 FROM tenants WHERE tenants.property_id = properties.id)
```

**Filters:**
- `propertyId`: If specified, returns 1 if property has tenants, 0 otherwise

**Notes:**
- An active property is one that has at least one tenant
- Uses Set to count distinct properties with tenants
- Returns 0 if no properties have tenants

### 6. Occupancy Rate

**Function:** `calculateOccupancyRate(properties, tenants, filters?)`

**Formula:**
```
(activeProperties / totalProperties) * 100
```

**Filters:**
- `propertyId`: If specified, returns 100% if property has tenants, 0% otherwise

**Notes:**
- Returns percentage (0-100)
- Rounded to nearest integer
- Returns 0 if no properties exist

### 7. Upcoming Rent (Pending)

**Function:** `calculateUpcomingRent(rentRecords, filters?)`

**Formula:**
```
SUM(amount) WHERE status = 'pending'
```

**Filters:**
- `propertyId`: Filter by specific property
- `dateRange`: Filter by date range (uses due_date for pending records)

**Notes:**
- Does NOT include late fees (pending rent hasn't incurred late fees yet)
- Used for projected calculations

### 8. Projected Expenses

**Function:** `calculateProjectedExpenses(expenses, days, filters?)`

**Formula:**
```
SUM(recurring_expense.amount * occurrences_in_period)
WHERE is_recurring = true
AND recurring_start_date <= projection_end
AND (recurring_end_date IS NULL OR recurring_end_date >= now)
```

**Filters:**
- `propertyId`: Filter by specific property

**Notes:**
- Projects recurring expenses for next N days
- Supports monthly, quarterly, yearly frequencies
- Respects recurring start/end dates
- Used for "Projected Net" calculation

## Helper Functions

### Filter Functions

**`filterRentRecords(records, filters?)`**
- Filters rent records by property and date range
- Uses `paid_date` for paid records, `due_date` for others

**`filterExpenses(expenses, filters?)`**
- Filters expenses by property and date range
- Uses `expense.date` for date filtering

**`calculateDateRange(timeRange, now?)`**
- Converts time range strings to date ranges
- Supports 'monthToDate' and 'yearToDate'

## Filter Precedence

1. **Page-wide filters** (date range + property) are applied first
2. **Graph-local overrides** may override page filters for graph only
3. **Graph overrides do NOT affect KPIs or ledger**

## Data Dependencies

All calculations depend on:
- **Rent Records**: Source of truth for income
- **Expenses**: Source of truth for costs
- **Properties**: For property-level filtering
- **Tenants**: For active properties and occupancy calculations

## Traceability

All calculations are traceable to ledger entries:
- Rent calculations → rent_records table
- Expense calculations → expenses table
- Property calculations → properties + tenants tables

## Recalculation Triggers

Calculations automatically update when:
- Rent records are added/edited/deleted
- Expenses are added/edited/deleted
- Tenants are added/edited/deleted
- Properties are added/edited/deleted
- Filters change

## V1 Canon Compliance

All calculations follow v1 canon requirements:
- ✅ No tax logic
- ✅ No depreciation
- ✅ No investment metrics
- ✅ No accounting classifications
- ✅ Simple, traceable formulas
- ✅ Filter-aware
- ✅ Late fees included in rent calculations

## Data Integrity

### Seed Data Cleanup

The production-realistic demo seed script (`scripts/seed-production-demo.ts`) includes automatic cleanup to prevent data accumulation across runs.

**Cleanup Process:**
1. Identifies all properties owned by demo landlord
2. Deletes associated data in correct foreign key order:
   - Messages (lease-scoped)
   - Work orders (property-scoped)
   - Rent records (property-scoped)
   - Expenses (property-scoped)
   - Tenant invites (landlord-scoped)
   - Leases (property-scoped)
   - Tenants (demo tenant users)
   - Properties (landlord-owned)

**Safety:**
- Only runs on staging (enforced by `enforceStagingOnly()`)
- Hard-fails if production environment detected
- Only affects demo landlord data (scoped to specific email pattern)

### Monetary Storage

All amounts stored in database as `NUMERIC(10, 2)` representing **dollars** (not cents).

**Examples:**
- `rent_amount NUMERIC(10, 2)` - Rent amount in dollars
- `amount NUMERIC(10, 2)` in `rent_records` - Payment amount in dollars
- `late_fee NUMERIC(10, 2)` - Late fee in dollars
- `amount NUMERIC(10, 2)` in `expenses` - Expense amount in dollars

**No conversion needed** at display boundaries - values are stored and displayed in the same unit (dollars).

### Accounting Policy

uhome uses **cash accounting** for MVP financial calculations:

- **Collected Revenue**: Uses `paid_date` (cash accounting)
  - Revenue is recognized when cash is received
  - Only includes records where `status = 'paid'` AND `paid_date IS NOT NULL`
  - Used in: Dashboard, Finances page, E2E test helpers
  
- **Projected Revenue**: Uses `due_date`
  - For pending/overdue rent records
  - Used for "Upcoming Rent" calculations
  
- **Expenses**: Uses `date` field
  - Expenses recorded on the date they were incurred
  
- **Net Income**: `collected_revenue - expenses` for same period
  - Both must use the same date range for accurate calculation
  - Dashboard shows current calendar month only
  - Finances page supports flexible date range filters

**Code Documentation:**
All revenue calculation functions include inline comments:
```typescript
// Collected revenue uses paid_date (cash accounting)
// Only include records where status='paid' AND paid_date is not null
```

This ensures consistent understanding across codebase and test files.

