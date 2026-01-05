# Visual UAT — uhome

## Philosophy

**"If mock data makes the app look broken, the MVP is broken."**

Visual UAT is product-critical, not cosmetic. The goal is to guarantee UI accuracy, data presence, readability, and aesthetic integrity using mock data that simulates an active power user.

### Core Principles

1. **Empty UI = Failed Test**: Dashboards must show data, not empty states
2. **Unreadable UI = Failed Test**: Text must be legible with proper contrast
3. **Flat, Lifeless UI = Failed Test**: Dark mode must show depth and elevation
4. **Broken Visuals = Broken Product**: If mock data makes the app look broken, the MVP is broken

### Why Visual UAT First?

Visual UAT comes before flow/E2E UAT because:

- **Rate Limits**: Full E2E tests hit Supabase rate limits (30 sign-ups per 5 minutes)
- **MVP Scope**: Visual correctness is product-critical for MVP
- **Fast Feedback**: Visual tests catch UI breakage immediately
- **Design Integrity**: Ensures design philosophy (clarity, depth, liveliness) is maintained

Flow/E2E UAT will be added later once rate limits are resolved.

## Adapter Architecture & UAT

Visual UAT is built on the **adapter architecture** that enables clean separation between UI, data access, and side effects. This architecture is a **product architecture pattern**, not a testing hack.

### Mock Provider Requirements

Visual UAT **requires** the adapter architecture to function:

- **Visual UAT uses mock data + mock side effects**: All data comes from `MockDataProvider`, all side effects use `MockSideEffectProvider`
- **No Supabase calls are allowed**: Visual tests must never hit the database
- **No real side effects**: Email, notifications, and automation are recorded, not executed
- **Adapter layer is a hard dependency**: Visual tests cannot run without the adapter architecture

### How It Works

When visual tests run with `?mock=true`:

1. Provider context selects `MockDataProvider` and `MockSideEffectProvider`
2. All hooks use mock providers (no Supabase client calls)
3. All data is deterministic (same data every run)
4. All side effects are recorded (not executed)

This ensures:
- **Deterministic screenshots**: Same data = same screenshots every run
- **No flaky tests**: No database dependency = no flaky data
- **Fast tests**: No network calls = faster execution
- **Visual correctness = pass/fail**: UI looks correct or it doesn't

### Visual UAT vs Flow / E2E UAT

**Visual UAT** (this document):
- **Purpose**: UI correctness, visual regression testing
- **Data**: Mock providers (deterministic, in-memory)
- **Side Effects**: Mock providers (recorded, not executed)
- **Focus**: How the UI looks, not how it behaves
- **Pass/Fail**: Visual correctness (screenshots match baselines)

**Flow / E2E UAT** (see [E2E Testing Guide](e2e-testing.md)):
- **Purpose**: End-to-end flow correctness
- **Data**: Mock providers (deterministic, in-memory)
- **Side Effects**: Mock providers (recorded, not executed)
- **Focus**: How workflows behave, not how they look
- **Pass/Fail**: Flow correctness (actions complete successfully)

Both use mock providers to avoid rate limits and ensure deterministic testing.

For detailed information about the adapter architecture, see [Adapter Architecture Guide](adapter-architecture.md).

## Mock Data Philosophy

Mock data in visual UAT is **deterministic and static**:

- **No randomness**: Same data on every run
- **No timestamps**: Fixed dates, not relative to "today"
- **No database dependency**: Mock data is in-memory/static, NOT Supabase (via `MockDataProvider`)
- **Power user simulation**: Represents an active landlord account with:
  - Multiple properties (3+)
  - Multiple tenants (3+)
  - 15+ months of historical rent records
  - 20+ expense records
  - 5+ maintenance requests
  - 10+ notes

This ensures visual tests produce **identical screenshots every run**, making diffs meaningful and reliable.

## Test Structure

Visual tests are located in `tests/visual/`:

```
tests/visual/
├── baselines/              # Git-tracked baseline screenshots
├── helpers/
│   ├── mock-data.ts        # Deterministic mock data
│   ├── mock-supabase.ts    # Network interception for mock data
│   └── visual-helpers.ts   # Test utilities
├── dashboard.spec.ts       # Dashboard visual tests
├── finances.spec.ts        # Finance page visual tests
├── operations.spec.ts      # Operations page visual tests
├── notes.spec.ts           # Notes visual tests
└── dark-mode.spec.ts      # Dark mode visual tests
```

## Running Visual Tests

### Local Development

```bash
# Run visual tests in headed mode (see browser)
npm run test:visual

# Run visual tests headless
npm run test:visual:headless

# Update baseline screenshots (after intentional UI changes)
npm run test:visual:update
```

### CI/CD

Visual tests run automatically in CI against staging environment:

- **Local dev**: Uses `localhost` (default)
- **CI**: Uses staging URL from `VISUAL_TEST_BASE_URL` env var
- **Never hardcode URLs**: Always use environment variables

## Baseline Management

### Creating Baselines

Baselines are created automatically on first test run. They are git-tracked in `tests/visual/baselines/`.

### Updating Baselines

When you make intentional UI changes:

1. Run tests to see diffs: `npm run test:visual:headless`
2. Review diffs carefully
3. If changes are intentional, update baselines: `npm run test:visual:update`
4. Commit updated baselines with your changes

### Reviewing Diffs

When visual tests fail:

1. Check the diff output in test results
2. Review screenshots in `test-results/` directory
3. Determine if diff is:
   - **Intentional**: Update baselines
   - **Unintentional**: Fix the UI bug
   - **Flaky**: Investigate timing/animation issues

## Acceptance Checklist

Each visual test validates:

### Global
- ✅ No empty dashboards unless intentionally designed
- ✅ No missing data placeholders
- ✅ No unreadable text
- ✅ No layout overlap or cutoff
- ✅ No broken hover states

### Finance Page
- ✅ Charts render with visible data
- ✅ Charts are non-empty
- ✅ Hover tooltips appear
- ✅ Range switching updates visuals smoothly
- ✅ Animations settle before screenshots

### Dark Mode
- ✅ Background is not pure black
- ✅ Depth is visible via contrast/elevation
- ✅ Cards are distinguishable
- ✅ Text contrast is readable (WCAG AA minimum)

### Operations Page
- ✅ Status pills: High contrast
- ✅ Status pills: Legible text
- ✅ Status pills: Clear semantic meaning

### Notes
- ✅ Saved notes remain visible
- ✅ No flicker or disappearance
- ✅ Notes appear populated by default

### Data Persistence
- ✅ Property names consistent across ledger, properties list, and property detail pages
- ✅ Tenant emails consistent across ledger and tenant list
- ✅ Ledger data consistent between ledger page and finances page
- ✅ Charts calculate from same data source as ledger
- ✅ Filters (property, date range, category) affect both charts and ledger consistently
- ✅ Graph type changes show correct visualizations with same underlying data
- ✅ Time range aggregation (month/quarter/year) works correctly
- ✅ Notes persist across navigation

For detailed data persistence tests, see `tests/visual/data-persistence.spec.ts`.

## Data Persistence Testing

Data persistence testing verifies that related data is consistent across components. This is critical for ensuring the mock data provider returns consistent, related data.

### What Data Persistence Means

In visual UAT context, data persistence means:
- **Property names** appear the same on dashboard, properties list, property detail, and ledger
- **Tenant emails** appear the same on tenant list, ledger, and property detail
- **Rent record amounts** match between ledger and financial calculations
- **Charts** calculate from the same data source as the ledger
- **Filters** affect all related components consistently

### Why Ledger-Chart Consistency is Critical

The ledger is a central component that:
- Displays property names, tenant emails, and amounts
- Appears in multiple locations (ledger page, finances page)
- Links to other components (property detail, tenant detail)
- Must match chart calculations

If charts and ledger use different data sources or calculations, the UI will show inconsistent information, breaking user trust.

### How Tests Verify Consistency

Data persistence tests:
1. Extract data from one component (e.g., property name from ledger)
2. Navigate to related component (e.g., property detail page)
3. Verify same data appears (e.g., property name matches)
4. Verify filters affect all components (e.g., property filter filters both charts and ledger)
5. Verify calculations match (e.g., KPI totals match ledger sums)

### Filter Accuracy

Filters must affect all related components:
- **Property filter**: Filters both charts and ledger
- **Date range filter**: Filters both charts and ledger
- **Category filter**: Filters expense data in both charts and ledger
- **Time range**: Aggregates chart data correctly (month/quarter/year)

Tests verify that when a filter is applied, all components show the same filtered data.

## What We Test vs Ignore

### ✅ DO Visual Test
- Dashboards
- Charts
- Status pills
- Dark mode
- Mock data presence
- Empty vs populated states

### ❌ DO NOT Visual Test (For Now)
- Payment correctness
- Auth edge cases
- Stripe subscription flows
- Deep multi-step workflows

These will be covered later by flow/E2E UAT once rate limits are resolved.

## Environment Variables

### Required for Visual Tests

- `VISUAL_TEST_BASE_URL`: Base URL for visual tests (defaults to `http://localhost:1000`)
  - **Local**: Not needed (defaults to localhost)
  - **CI**: Set to staging URL (e.g., `https://staging.uhome.app`)

### Optional

- `VITE_SUPABASE_URL`: Supabase URL (for mock data setup)
- `VITE_SUPABASE_ANON_KEY`: Supabase anon key (for mock data setup)

## Troubleshooting

### Tests Fail with "No baseline found"

Run tests once to create baselines: `npm run test:visual:headless`

### Screenshots Don't Match

1. Check if UI changes were intentional
2. If intentional: Update baselines with `npm run test:visual:update`
3. If unintentional: Fix the UI bug

### Mock Data Not Loading

- Verify `?mock=true` is in URL (enables mock providers)
- Check that adapter architecture is implemented (see [Adapter Architecture Guide](adapter-architecture.md))
- Verify `MockDataProvider` is selected (check provider context)
- Verify mock data structure matches app expectations

### Animations Cause Flaky Tests

- Tests wait for animations to settle automatically
- If still flaky, increase wait times in `visual-helpers.ts`

## Data Persistence Testing

Data persistence tests verify that related data is consistent across components. This ensures that:

- **Property names match** across ledger, properties list, and property detail pages
- **Tenant emails match** across ledger, tenant list, and property detail pages
- **Charts calculate from the same data source** as the ledger
- **Filters affect both charts and ledger** consistently (property, date range, category)
- **Graph type changes** show correct visualizations with the same underlying data
- **Time range aggregation** (month/quarter/year) works correctly and affects both charts and ledger
- **Notes persist** across navigation and are consistent across views

### What Data Persistence Means

In the context of visual UAT, data persistence means:

1. **Data Consistency**: The same property name, tenant email, or amount appears consistently across all views (ledger, finances page, property detail, tenant detail)
2. **Chart-Ledger Alignment**: Charts calculate totals from the same data source as the ledger, ensuring financial metrics match
3. **Filter Consistency**: When a filter is applied (property, date range, category), both the charts and the ledger reflect the same filtered data
4. **Graph Type Accuracy**: Switching between graph types (line, bar, donut, pie) shows the same underlying data in different visualizations
5. **Time Range Aggregation**: Switching between month/quarter/year views correctly aggregates data and updates both charts and ledger

### How Tests Verify Consistency

Data persistence tests:

- Extract data from one component (e.g., property name from ledger)
- Navigate to another component (e.g., properties page)
- Verify the same data appears (e.g., property name matches)
- Apply filters and verify both charts and ledger update consistently
- Switch graph types and verify underlying data remains consistent
- Change time ranges and verify aggregation works correctly

### Why Ledger-Chart Consistency is Critical

The ledger is the source of truth for financial data. Charts must:

- Calculate totals from the same data source as the ledger
- Reflect the same filtered data when filters are applied
- Show the same underlying data when graph types change
- Aggregate correctly when time ranges change

If charts and ledger show different data, users cannot trust the financial metrics displayed.

### How Filters Should Affect All Related Components

When a filter is applied:

1. **Property filter**: Both charts and ledger should show only data for the selected property
2. **Date range filter**: Both charts and ledger should show only data within the selected date range
3. **Category filter**: Both charts and ledger should show only expenses in the selected category

Filters must be consistent—if a filter is applied, all related components must reflect the same filtered data.

### Test Coverage

Data persistence tests are located in `tests/visual/data-persistence.spec.ts` and cover:

- Ledger-Property Consistency: Property names match across components
- Ledger-Tenant Consistency: Tenant emails and relationships are consistent
- Ledger-Chart Data Consistency: Charts use same data source as ledger
- Chart Filter Accuracy: Filters affect both charts and ledger consistently
- Graph Type Accuracy: Graph type changes show correct visualizations
- Time Range Aggregation: Time range changes aggregate data correctly
- Ledger Notes Persistence: Notes persist across navigation

## Adapter Layer Dependency

**The adapter layer is a hard dependency for visual UAT.**

Visual tests **must**:
- Run with mock providers (selected via `?mock=true`)
- Never hit Supabase (all data from `MockDataProvider`)
- Never trigger real side effects (all side effects use `MockSideEffectProvider`)

Without the adapter architecture, visual UAT cannot function reliably. The adapter layer enables:
- Deterministic mock data (no flaky tests)
- No database dependency (faster tests)
- No side effects (safe testing)
- Visual correctness as pass/fail condition
- **Data consistency**: Mock provider returns consistent data across all components

See [Adapter Architecture Guide](adapter-architecture.md) for implementation details.

## Future Enhancements

- Flow/E2E UAT (using mock providers, no rate limits)
- Payment correctness tests
- Auth edge case tests
- Stripe subscription flow tests
- Multi-step workflow tests

These will be covered by flow/E2E UAT using the adapter architecture (no rate limits).

