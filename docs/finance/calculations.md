# Finance Calculations Documentation

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

