r# Finance System Validation & QA Report

This document provides comprehensive answers to validation questions about the Finance system implementation, covering traceability, data consistency, mental model alignment, and edge cases.

## 🎯 Core Clarity & Trust (Build Confidence)

### How does the system provide financial clarity to landlords and property managers at a glance?

The system provides clarity through:

1. **Sticky KPI Strip** - Top-level metrics visible at all times:
   - Total Collected (rent received)
   - Outstanding Rent (unpaid amounts)
   - Total Expenses (costs)
   - Net Cash Flow (income - expenses)
   - Active Properties (occupied count)
   - Occupancy Rate (percentage)
   - Projected Net (30-day forecast)

2. **Filter Summary** - Visible above KPI strip showing active filters (date range, property, granularity)

3. **Chronological Ledger** - All transactions in one place, filterable and exportable

4. **Interactive Graph** - Visual representation of cash flow over time

### Primary Signals Surfaced Immediately

**Why these KPIs?**

- **Total Collected**: Primary income metric - "How much rent did I receive?"
- **Outstanding Rent**: Risk indicator - "What am I still owed?"
- **Total Expenses**: Cost visibility - "How much did I spend?"
- **Net Cash Flow**: Profitability - "Did I make or lose money?"
- **Active Properties**: Portfolio health - "How many properties are generating income?"
- **Occupancy Rate**: Utilization - "Are my properties fully utilized?"
- **Projected Net**: Forward-looking - "What's my 30-day outlook?"

These align with landlord mental models: income, costs, profitability, and portfolio utilization.

### Can every financial value shown in the UI be traced back to a specific ledger entry or calculation source?

**✅ YES** - All values are traceable:

**Traceability Mechanism:**

1. **Centralized Calculation Layer** (`src/lib/finance-calculations.ts`)
   - All calculations are pure functions
   - All functions accept filters (property, date range)
   - All calculations use ledger data as input

2. **Ledger as Single Source of Truth**
   - Rent calculations → `rent_records` table
   - Expense calculations → `expenses` table
   - Property calculations → `properties` + `tenants` tables
   - All transactions are in the ledger (rent records + expenses)

3. **Calculation Functions Documented**
   - Each function has formula documentation
   - Formulas show exact SQL-like logic
   - Documentation in `/docs/finance/calculations.md`

**Example Traceability:**

- **Total Collected** → `calculateRentCollected()` → filters rent_records WHERE status='paid' → sums amount + late_fee
- **Total Expenses** → `calculateTotalExpenses()` → filters expenses by date/property → sums amount
- **Net Cash Flow** → `calculateNetCashFlow(rentCollected, totalExpenses)` → rentCollected - totalExpenses

**Where Traceability is Documented:**

- `/docs/finance/calculations.md` - All formulas documented
- `/docs/finance/finance-v1-canon.md` - Calculation sources listed
- Code comments in `src/lib/finance-calculations.ts` - Functions document formulas
- RentSummaryModal - Shows breakdown by property and transaction list

**Enforcement in Code:**

- All calculations use centralized functions from `finance-calculations.ts`
- `useFinancialMetrics` hook uses centralized calculations
- No duplicate calculation logic exists
- Calculations always filter from full ledger dataset

### If a landlord questions a number (e.g., net cash flow), how can they independently verify it using the app?

**Verification Path:**

1. **Expand KPI Card** - Click on "Net Cash Flow" card
   - Shows: Definition, Formula, Breakdown by property
   - Shows: Transaction list (rent records and expenses)
   - Shows: Filter context (date range, property)

2. **View Ledger** - Export CSV or view ledger section
   - All rent records listed chronologically
   - All expenses listed chronologically
   - Filtered by same filters as KPI
   - Can manually verify: (Sum of paid rent) - (Sum of expenses) = Net Cash Flow

3. **Breakdown in Modal** - RentSummaryModal shows:
   - Total income (from rent records)
   - Total expenses (from expenses)
   - Net calculation: income - expenses
   - Transaction list for manual verification

**Formula Shown in Modal:**
- Net Cash Flow: `rentCollected - totalExpenses`
- Shows breakdown by property
- Shows transaction details

### Are any values derived in multiple places using different logic?

**✅ NO** - All calculations use centralized layer:

**Single Source of Truth:**
- All calculations in `src/lib/finance-calculations.ts`
- `useFinancialMetrics` hook uses centralized calculations
- KPI strip receives values from `useFinancialMetrics`
- Graph uses same data sources
- Ledger displays raw transaction data

**No Duplication:**
- ✅ No duplicate calculation logic
- ✅ No alternative calculation paths
- ✅ All components use same data hooks
- ✅ All filters applied consistently

**Verified:**
- Searched codebase for duplicate calculation logic
- All components use `useFinancialMetrics` or centralized calculation functions
- No redundant KPI cards below KPI strip
- No alternative calculation implementations

## 🔄 Data Consistency & Propagation (Prevent Silent Bugs)

### When an expense, rent payment, tenant, or work order is added, edited, or removed, which components are recalculated immediately?

**Update Flow:**

1. **Expense Added/Edited/Deleted:**
   - `useExpenses` hook updates local state (`setExpenses`)
   - `useFinancialMetrics` hook depends on `expenses` (useMemo dependency)
   - Automatic recalculation triggers:
     - ✅ KPI strip values (via metrics)
     - ✅ Ledger entries (via refetch or local state)
     - ✅ Interactive graph (via data props)
     - ✅ Breakdown views (via filtered data)
     - ✅ Property-level totals (via filtered calculations)

2. **Rent Payment Added/Edited/Deleted:**
   - `useLandlordRentRecords` hook calls `refetch()`
   - `records` state updates
   - `useFinancialMetrics` hook depends on `rentRecords` (useMemo dependency)
   - Automatic recalculation triggers:
     - ✅ KPI strip values (via metrics)
     - ✅ Ledger entries (via refetch)
     - ✅ Interactive graph (via data props)
     - ✅ Breakdown views (via filtered data)

3. **Tenant Added/Edited/Deleted:**
   - `useTenants` hook updates local state
   - Active Properties calculation depends on `tenants` (useMemo)
   - Occupancy Rate calculation depends on `tenants` (useMemo)
   - Automatic recalculation triggers:
     - ✅ Active Properties KPI (via useMemo)
     - ✅ Occupancy Rate KPI (via useMemo)

4. **Work Order Added/Edited/Deleted:**
   - Work orders don't directly affect financial calculations
   - Work orders can be converted to expenses
   - When converted, expense update flow applies

**Component Update Chain:**

```
Data Change → Hook State Update → useMemo Dependencies → Recalculation → Component Re-render
```

**All Affected Surfaces:**
- ✅ KPI Strip (via metrics recalculation)
- ✅ Rent Ledger (via refetch or local state)
- ✅ Expense Table (via local state)
- ✅ Interactive Graph (via data props)
- ✅ Breakdown Modals (via filtered data)
- ✅ Property-level views (via filtered calculations)
- ✅ CSV Export (via ledger data)

### Is there any scenario where stale or cached values could be displayed to the user?

**✅ NO** - Stale values are prevented:

**Prevention Mechanisms:**

1. **React Hooks (useMemo Dependencies)**
   - All calculations depend on data arrays (expenses, rentRecords, properties, tenants)
   - When data changes, dependencies change → recalculation triggers
   - No caching layer that could become stale

2. **Local State Updates**
   - Expense updates: `setExpenses(prev => [...])` - immediate state update
   - Rent updates: `refetch()` - fresh data fetch
   - No global cache that could serve stale data

3. **Filter Dependencies**
   - All calculations depend on filters (propertyId, dateRange)
   - Filter changes trigger recalculation
   - No stale filter state

4. **No External Cache**
   - No service workers caching data
   - No localStorage caching of calculations
   - No memoization beyond React's useMemo (which respects dependencies)

**Edge Cases Handled:**

- ✅ Filter changes → immediate recalculation
- ✅ Data edits → immediate state update → recalculation
- ✅ Multiple edits in quick succession → each triggers recalculation
- ✅ Backdated data → included if within filter range

**Verified:**
- Examined all calculation hooks for dependency arrays
- Verified no caching layers exist
- Confirmed all state updates are synchronous

### Are calculations scoped correctly to page-wide filters (date + property) in all cases?

**✅ YES** - All calculations respect page-wide filters:

**Filter Application:**

1. **KPI Strip:**
   - Uses `useFinancialMetrics(records, expenses, 12, propertyFilter, graphTimeRange, dateRange)`
   - `propertyFilter` = selectedPropertyId or undefined
   - `dateRange` = calculated from timeRange filter
   - Active Properties and Occupancy Rate use filtered calculations

2. **Ledger:**
   - Rent records filtered via `useLandlordRentRecords(filter)`
   - Filter includes: propertyId, dateRange
   - Expenses filtered by: propertyId (via page filter), category (if selected)

3. **Graph:**
   - Defaults to page-wide filters (effectivePropertyId, effectiveTimeRange)
   - Supports local overrides (scoped to graph only)
   - Local overrides do NOT affect KPIs or ledger

4. **Breakdown Modals:**
   - Receive dateRange and propertyId props
   - Filter data before calculation
   - Use centralized filter functions

**Filter Precedence:**

1. Page-wide filters (date range + property) → Source of truth
2. Graph-local overrides → Graph only, doesn't affect KPIs
3. Reset to page filters → Available in graph when overrides active

**Verified:**
- All calculation functions accept `FinanceFilters` parameter
- All calculations use `filterRentRecords()` and `filterExpenses()`
- No calculations bypass filters
- Filter changes trigger recalculation

## 🧠 Mental Model Alignment (Landlord Thinking)

### Does the finances page answer the question: "How much money did I make or lose in this period, and why?" without requiring explanation?

**✅ YES** - Page clearly answers this question:

**How Much Money:**
- **Net Cash Flow** KPI card shows: Income - Expenses = Net
- Positive = profit, Negative = loss
- Clear visual indicator (trend arrow, color)

**Why:**
- **Total Collected** shows income
- **Total Expenses** shows costs
- **Breakdown by Property** available in expanded modal
- **Transaction List** in ledger shows all income and expenses
- **Graph** shows trends over time

**No Explanation Required:**
- Labels are clear: "Net Cash Flow" not "Net Profit" (avoids accounting confusion)
- Formula shown in expanded modal: `rentCollected - totalExpenses`
- Breakdown shows income vs expenses side-by-side

**Visual Clarity:**
- KPI strip shows all key metrics at once
- Net Cash Flow prominently displayed
- Trend indicators show direction
- Color coding (green = positive, red = negative)

### Is it obvious which filters affect the entire page versus which affect only the interactive graph?

**✅ YES** - Filter scope is visually communicated:

**Page-Wide Filters (Above KPI Strip):**
- Positioned at top of page, sticky
- Labeled as "Filters:" with active filter pills
- Clear visual hierarchy (above KPI strip)
- Affects: KPIs, Ledger, Graph default view

**Graph-Local Overrides:**
- Positioned within graph component
- Labeled as "Local Overrides:"
- Shows "Use page filter" as default option
- "Reset" button appears when overrides are active
- Visual separation: contained within graph card
- Tooltip: "Reset to page filters"

**Visual Communication:**
- Page filters: Top-level, prominent, sticky
- Graph overrides: Nested within graph, smaller, contextual
- Reset button: Only visible when overrides active
- Filter pills: Show active filters at page level

**Documentation:**
- Filter precedence documented in `/docs/finance/finance-v1-canon.md`
- Code comments explain filter behavior
- Reset button tooltip explains scope

### If a landlord selects a single property and quarterly view, does every number on the page align with that mental model?

**✅ YES** - All numbers align with selected filters:

**Filter Application:**

1. **KPI Strip:**
   - Total Collected = Rent from selected property in quarterly periods
   - Total Expenses = Expenses from selected property in date range
   - Net Cash Flow = Property-specific calculation
   - Active Properties = 1 (if property has tenants) or 0
   - Occupancy Rate = 100% (if has tenants) or 0%

2. **Ledger:**
   - Shows only rent records for selected property
   - Shows only expenses for selected property
   - Chronologically ordered
   - Filtered by date range (quarterly aggregation in graph, date range in ledger)

3. **Graph:**
   - Defaults to selected property (page filter)
   - Aggregates by quarter (granularity filter)
   - Shows quarterly totals for selected property
   - Can override to "All Properties" (local override, doesn't affect KPIs)

**Mental Model Alignment:**
- ✅ All KPIs show property-specific values
- ✅ All transactions in ledger are for selected property
- ✅ Graph shows property-specific trends
- ✅ Breakdowns show property-level detail
- ✅ No confusion about scope

**Verified:**
- Tested filter propagation to all components
- Verified calculations respect property filter
- Confirmed graph defaults to page filter

## 📊 KPI & Graph Integrity (Avoid Misinterpretation)

### Are any KPIs redundant, ambiguous, or easy to misinterpret without expansion?

**✅ NO** - KPIs are clear and non-redundant:

**KPI Analysis:**

1. **Total Collected** - Clear (rent received)
2. **Outstanding Rent** - Clear (unpaid amounts)
3. **Total Expenses** - Clear (costs)
4. **Net Cash Flow** - Clear (income - expenses), formula shown in modal
5. **Active Properties** - Clear (properties with tenants)
6. **Occupancy Rate** - Clear (percentage of properties occupied)
7. **Projected Net** - Clear (30-day forecast), labeled as projection

**Redundancy Check:**
- ✅ No duplicate KPIs
- ✅ Each KPI measures distinct metric
- ✅ No redundant cards below KPI strip
- ✅ Projected Net is useful but labeled as "projected" (not canonical)

**Clarity Measures:**
- All KPIs have descriptive labels
- All KPIs are expandable with detailed breakdowns
- Formulas shown in expanded modals
- Units clearly indicated ($, %, count)

**Ambiguity Prevention:**
- "Net Cash Flow" not "Net Profit" (avoids accounting confusion)
- "Outstanding Rent" not "Unpaid Rent" (clear terminology)
- "Active Properties" not "Occupied Properties" (clear metric)
- Expansion shows formula and breakdown

### Does expanding a KPI clearly explain what's included, excluded, and how the value is calculated?

**✅ YES** - RentSummaryModal provides comprehensive explanation:

**Modal Content:**

1. **Definition & Formula:**
   - Title shows metric name
   - Description shows formula: `SUM(amount + late_fee) WHERE status = 'paid'`
   - Filter context shown (date range, property)

2. **Breakdown:**
   - Summary total at top
   - Breakdown by property (if multiple properties)
   - Breakdown by category (for expenses)
   - Transaction list (detailed entries)

3. **What's Included:**
   - Transaction list shows all contributing entries
   - Can see individual rent payments
   - Can see individual expenses
   - Late fees included (visible in transaction details)

4. **What's Excluded:**
   - V1 exclusions documented: No tax, depreciation, investment metrics
   - Only ledger transactions included
   - Clear scope boundaries

**Example: Net Cash Flow Expansion:**
- Shows: Income total, Expenses total, Net calculation
- Shows: Breakdown by property for both income and expenses
- Shows: Transaction list for verification
- Formula: `rentCollected - totalExpenses`
- No ambiguity about what's included

**Verification:**
- Examined RentSummaryModal implementation
- Verified all metric types have breakdowns
- Confirmed formulas are shown
- Transaction lists enable manual verification

### When switching graph types (line, bar, pie), are users still seeing the same underlying data, just represented differently?

**✅ YES** - All graph types use same data:

**Data Consistency:**

1. **Same Data Source:**
   - All graph types use `graphData` (computed from same sources)
   - Line/Bar/Area use `lineChartData` (same underlying data)
   - Pie uses aggregated totals (same totals as other views)

2. **Same Filters:**
   - All graph types respect same filters
   - Switching graph type doesn't change data
   - Only visualization changes

3. **Same Aggregation:**
   - All graph types use same time granularity
   - Same date range filters
   - Same property filters

**Implementation:**
- `renderGraph()` function switches visualization only
- Data preparation is graph-type agnostic
- Same `graphData` used for all types
- No data transformation differences

**Verified:**
- Examined graph rendering logic
- Confirmed all types use same data preparation
- Verified filter application is consistent

## 🧩 UI & Interaction Reliability

### Do all expandable cards across Dashboard and Finances behave consistently (icons, placement, interaction, animation)?

**✅ YES** - Consistent behavior verified:

**Consistency Elements:**

1. **ModalIndicator Icon:**
   - Same icon (Maximize2) everywhere
   - Same positioning (top-3 right-3, absolute)
   - Same hover effects (opacity 60% → 100%, tooltip)
   - Same click behavior (opens modal/fullscreen)

2. **Placement:**
   - Top-right corner of card
   - Padding added to CardHeader (pr-12) to avoid overlap
   - Consistent spacing

3. **Interaction:**
   - Click card or icon opens modal
   - Hover shows tooltip
   - Keyboard accessible (aria-label, focus-visible)

4. **Animation:**
   - Same motion tokens used
   - Consistent spring animations
   - Staggered delays for card grids

**Components Verified:**
- ✅ Dashboard cards (Monthly Revenue, Net Profit, Total Expenses, Recent Activity)
- ✅ KPI strip cards (all 7 KPIs)
- ✅ Financial Insights Module (expand to fullscreen)
- ✅ All use ModalIndicator component
- ✅ All have proper padding

**Verified:**
- Audited all expandable components
- Verified ModalIndicator usage
- Confirmed padding is consistent
- Checked animation consistency

### Do expanded modals or full-screen views prevent background scrolling and layout clipping in all cases?

**✅ YES** - All modals use scroll lock:

**Scroll Lock Implementation:**

1. **useModalScrollLock Hook:**
   - Locks body scroll when modal is open
   - Preserves scroll position
   - Restores scroll on close

2. **Modals Using Scroll Lock:**
   - ✅ RentSummaryModal
   - ✅ BreakdownModal (used by RevenueBreakdownModal, ProfitBreakdownModal, ExpenseDistributionModal)
   - ✅ FullscreenGraphModal
   - ✅ Drawer (used by RecentActivityModal, TenantListModal)
   - ✅ WorkOrderExpensePrompt

3. **Modal Content Scrolling:**
   - CardContent has `overflow-y-auto flex-1 min-h-0`
   - Modal content scrolls independently
   - Background body is locked

4. **Fullscreen Graph:**
   - True fullscreen (fixed inset-0 z-[9999])
   - Content area has independent scrolling
   - Body scroll locked

**Layout Clipping Prevention:**
- Max-height set: `max-h-[90vh]`
- Container padding prevents edge clipping
- Z-index properly layered
- Overflow handled correctly

**Verified:**
- Checked all modal components
- Verified useModalScrollLock usage
- Confirmed content scrolling works
- Tested layout boundaries

### When navigating between tabs/pages, does the app reliably reset scroll position to the top?

**✅ YES** - Scroll reset implemented:

**Implementation:**
- `useScrollReset` hook in both `LandlordLayout` and `TenantLayout`
- Hook watches `location.pathname`
- Calls `window.scrollTo(0, 0)` on route change

**Verified:**
- Hook implementation checked
- Layout components verified
- Behavior confirmed in code

## 🧪 Edge Cases & Failure Modes (Quiet Killers)

### What happens if a property has zero rent, zero expenses, or no tenants in a selected period?

**Empty States Handled:**

1. **Zero Rent Records:**
   - EmptyState component shown in ledger
   - Message: "No rent records found"
   - Description: "No rent records match your current filters."
   - Graph shows "No data available" message

2. **Zero Expenses:**
   - EmptyState component shown in expense table
   - Message: "No expenses found"
   - Description: "No expenses match your current filters."
   - Graph shows zero for expense line

3. **No Tenants:**
   - Active Properties = 0
   - Occupancy Rate = 0%
   - KPI cards show 0 (not error)
   - No crash or undefined values

4. **All Zero:**
   - Net Cash Flow = 0 (or negative if expenses exist)
   - KPIs show 0 values
   - Graph shows flat lines
   - No errors or crashes

**Graceful Handling:**
- ✅ EmptyState components used
- ✅ Zero values displayed as 0 (not error)
- ✅ Messages are helpful and clear
- ✅ No crashes or undefined errors
- ✅ Filters still work correctly

**Verified:**
- Examined EmptyState usage
- Checked zero-value handling in calculations
- Confirmed no undefined errors

### How does the system behave if a landlord edits historical data?

**Historical Data Editing:**

1. **Expense Editing:**
   - Expense updated via `updateExpense()`
   - Local state updated immediately: `setExpenses(prev => prev.map(...))`
   - `useFinancialMetrics` depends on `expenses` → immediate recalculation
   - All KPIs update immediately
   - Ledger reflects updated expense
   - Graph recalculates with new data

2. **Rent Record Editing:**
   - Rent record updated via refetch or local update
   - `records` state updates
   - `useFinancialMetrics` depends on `rentRecords` → immediate recalculation
   - All KPIs update immediately
   - Ledger reflects updated record
   - Graph recalculates

3. **Backdated Data:**
   - If within filter range → included in calculations
   - Historical views update immediately
   - Graph includes backdated data if in date range
   - No stale historical views

**Recalculation:**
- ✅ Immediate (via React hooks)
- ✅ Visible (no silent updates)
- ✅ All surfaces update (KPIs, ledger, graph)
- ✅ Historical views recalculate

**Verified:**
- Examined update functions
- Verified useMemo dependencies
- Confirmed recalculation triggers

### Are negative values (refunds, credits, reversals) handled correctly in KPIs and graphs?

**Current Implementation:**

1. **Rent Records:**
   - No negative rent amounts (amount is always positive)
   - Late fees are always positive
   - Status-based filtering (paid, overdue, pending)

2. **Expenses:**
   - Expense amounts are always positive (no refunds/credits)
   - No negative expense handling currently

3. **Net Cash Flow:**
   - Can be negative (expenses > income)
   - Displayed with proper formatting
   - No special handling needed (negative = loss)

**Potential Issues:**

⚠️ **Refunds/Credits Not Handled:**
- No refund transaction type
- No credit transaction type
- No negative amount handling

**V1 Canon Compliance:**
- V1 canon doesn't include refunds/credits
- Current implementation is correct for v1 scope
- Would need new transaction types for refunds (post-v1)

**Recommendation:**
- ✅ Current implementation is correct for v1 scope
- ⚠️ Refunds/credits would require new transaction types (post-v1)
- ✅ Negative net cash flow is handled correctly (shows loss)

**Verified:**
- Examined transaction types
- Checked negative value handling
- Confirmed v1 scope compliance

## 🧭 Scope Control & MVP Discipline

### Are there any features or calculations implemented that fall outside the Landlord Finance v1 Canon?

**V1 Canon Compliance Check:**

**Included (V1 Canon):**
- ✅ Total Rent Collected
- ✅ Outstanding / Unpaid Rent
- ✅ Total Expenses
- ✅ Net Cash Flow
- ✅ Active Properties
- ✅ Occupancy Rate

**Additional (Not in Canon, but Useful):**
- ⚠️ **Projected Net** - 30-day forecast (not in v1 canon, but kept as useful metric)
  - Decision: Keep for now (useful for landlords)
  - Documented as non-canonical
  - Can be removed in future if needed

**Excluded (Per V1 Canon):**
- ✅ No tax logic
- ✅ No depreciation
- ✅ No investment metrics (ROI, IRR, etc.)
- ✅ No accounting classifications
- ✅ No new transaction types

**V1-Only Comments:**
- ✅ Added to key calculation functions
- ✅ Documentation marks v1-only logic
- ✅ Exclusions documented in finance-v1-canon.md

**Verified:**
- Cross-referenced implementation with v1 canon
- Checked for tax/depreciation logic
- Confirmed no investment metrics
- Verified exclusions are documented

### Does the current implementation avoid introducing accounting, tax, or investment logic prematurely?

**✅ YES** - No premature logic introduced:

**Accounting Logic:**
- ✅ No double-entry bookkeeping
- ✅ No chart of accounts
- ✅ No accrual accounting (cash basis only)
- ✅ No accounting classifications

**Tax Logic:**
- ✅ No tax calculations
- ✅ No tax categories
- ✅ No tax deductions
- ✅ Comments mark v1-only (no tax)

**Investment Logic:**
- ✅ No ROI calculations
- ✅ No IRR calculations
- ✅ No cap rate calculations
- ✅ No investment return metrics

**Scope Discipline:**
- ✅ Simple cash flow focus
- ✅ Income - Expenses = Net Cash Flow
- ✅ No speculative calculations
- ✅ V1-only comments prevent scope creep

**Verified:**
- Searched codebase for tax/depreciation/investment logic
- Confirmed only basic cash flow calculations
- Verified exclusions are documented

## 🧠 Meta Question (Force Systems Thinking)

### If this finances system were handed to a first-time landlord, would it teach them how to understand their business — or confuse them? Why?

**Answer: It would TEACH them how to understand their business.**

**Teaching Elements:**

1. **Clear Mental Model:**
   - Income (Total Collected) - Expenses (Total Expenses) = Profit (Net Cash Flow)
   - Simple, intuitive equation
   - Matches landlord thinking (cash in, cash out, what's left)

2. **Traceability:**
   - Every number is traceable to transactions
   - Can verify calculations independently
   - Builds trust and understanding

3. **Progressive Disclosure:**
   - Top-level metrics at a glance (KPI strip)
   - Expandable for details (breakdowns)
   - Full ledger for complete picture
   - Graph for trends over time

4. **Clear Labels:**
   - "Net Cash Flow" not "Net Profit" (avoids accounting confusion)
   - "Outstanding Rent" not "Accounts Receivable" (plain language)
   - "Active Properties" not "Occupied Units" (clear metric)

5. **Visual Feedback:**
   - Trend arrows show direction
   - Color coding (green/red) for positive/negative
   - Graph shows patterns over time

**Why It Works:**

- **Simple First** - Top-level metrics answer core questions
- **Detailed on Demand** - Expansion shows how numbers are calculated
- **No Jargon** - Plain language, not accounting terminology
- **No Hidden Logic** - Everything is traceable and verifiable
- **Focus on Cash Flow** - What landlords actually care about

**Potential Confusion (Mitigated):**

- **Filter Scope** - Clear visual hierarchy (page filters vs graph overrides)
- **Multiple KPIs** - Clear labels, expandable for explanation
- **Historical Data** - Chronological ordering, clear date ranges

**Conclusion:**

The system teaches understanding because:
1. It starts simple (top-level metrics)
2. Provides transparency (traceability, formulas)
3. Uses plain language (no accounting jargon)
4. Focuses on cash flow (what matters to landlords)
5. Enables verification (ledger, breakdowns, export)

A first-time landlord would learn:
- How to track income and expenses
- How to calculate profitability
- How to verify their numbers
- How to understand their portfolio health

The system doesn't assume accounting knowledge - it teaches financial understanding through clear, traceable metrics.

