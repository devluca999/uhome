# MVP Scope — uhome

## Overview

This document clearly separates MVP features (must feel real and usable with mock data) from post-MVP features (documented but not implemented). The MVP should feel like a complete, actively-used tool, not an incomplete demo.

## MVP Features (Must Feel Real with Mock Data)

### Core Property Management
- ✅ Property CRUD (create, read, update, delete)
- ✅ Property details (name, address, rent amount, due date, rules)
- ✅ Property grouping and organization
- ✅ Property types and categorization

### Tenant Management
- ✅ Tenant CRUD operations
- ✅ Tenant invites (email-based invitation system)
- ✅ Tenant-property linking
- ✅ Tenant profiles and information
- ✅ Multiple tenant users per household (always free, not gated)

### Rent Tracking
- ✅ Manual rent record entry
- ✅ Payment status tracking (paid, pending, overdue)
- ✅ Payment method tracking (Zelle, Cash, Check, Venmo, Bank Transfer)
- ✅ Rent due dates and paid dates
- ✅ Rent ledger view with filtering
- ✅ Receipt generation (PDF)

### Expense Tracking
- ✅ Expense CRUD operations
- ✅ Expense categories (maintenance, utilities, repairs, insurance, taxes, etc.)
- ✅ Expense date and amount tracking
- ✅ Recurring expense support
- ✅ Expense filtering and organization

### Maintenance Requests
- ✅ Maintenance request creation (tenants)
- ✅ Status tracking (pending, in_progress, completed)
- ✅ Category assignment
- ✅ Description and details
- ✅ Property and tenant linking

### Tasks System
- ✅ Task creation and management
- ✅ Task assignment (tenant, household, unit)
- ✅ Task status (pending, completed)
- ✅ Task checklists
- ✅ Task linking to work orders, move-ins, properties, rent records

### Notes System
- ✅ Notes creation and editing
- ✅ Notes on properties, tenants, rent records, expenses, maintenance requests
- ✅ Notes persistence (survives navigation)
- ✅ Notes organization by entity type

### Financial Metrics & Charts
- ✅ Financial dashboard with key metrics
- ✅ Rent collection charts (line, bar, donut, pie)
- ✅ Expense breakdown charts
- ✅ Income vs expenses trends
- ✅ Net profit calculations
- ✅ Margin percentages
- ✅ Historical trends (12+ months of data)
- ✅ Chart interactions (hover tooltips, date range filtering)
- ✅ Animated chart transitions

### Documents Storage
- ✅ Document upload and storage
- ✅ Document organization by property
- ✅ Document viewing and download
- ✅ File type support (PDFs, images, etc.)

### Mock Data Mode
- ✅ Power-user account simulation
- ✅ 12+ months of historical data
- ✅ Multiple properties and tenants
- ✅ Varied transaction types and statuses
- ✅ Realistic financial distributions
- ✅ Automated rent collection UI/UX simulation (statuses, trends, visual states)
- ✅ Payment statuses (paid, pending, overdue) with realistic patterns
- ✅ Financial trends visualization
- ✅ No empty screens by default

### Subscriptions & Billing (Landlord Only)
- ✅ Stripe Subscriptions integration (landlord billing)
- ✅ Free and Pro plan tiers
- ✅ Subscription management
- ✅ Organization-level subscriptions
- ✅ Pro plan collaborator invites (hard cap: 2 landlord-side users)

### Organizations & Memberships
- ✅ Organization/workspace model
- ✅ User memberships with roles (Owner, Collaborator, Tenant)
- ✅ Organization auto-creation
- ✅ Pro plan collaboration (1 collaborator max)

### User Experience
- ✅ Role-based navigation (landlord vs tenant)
- ✅ Responsive design
- ✅ Dark mode support
- ✅ Smooth animations and transitions
- ✅ Hover states and interactive feedback
- ✅ Clear status indicators
- ✅ Intuitive navigation

## Post-MVP Features (Documented but NOT in MVP)

### Map & Location Features
- ❌ Interactive property + home map view
- ❌ Tenant & landlord shared map view
- ❌ One-tap "go home" / "go to property" workflows
- ❌ Location-based features
- ❌ Potential Uber/Lyft brand collaboration

### Advanced Team Features
- ❌ Team accounts (beyond Pro plan's 2-user limit)
- ❌ Task assignment workflows
- ❌ Advanced workflow automation
- ❌ Role matrix UI
- ❌ Per-seat billing
- ❌ Multi-org support

### Payment Processing
- ❌ Stripe Connect integration (rent payment processing)
- ❌ Automated rent collection (real payment processing)
- ❌ Payment disputes handling
- ❌ Advanced accounting & payouts
- ❌ Payment gateway setup
- ❌ Plaid integration

### Advanced Features
- ❌ CSV imports/exports
- ❌ Bulk data import
- ❌ Advanced analytics & forecasting
- ❌ Predictive analytics
- ❌ Multi-axis charts
- ❌ Stacked visualizations
- ❌ Revenue forecasting

### Legal & Compliance
- ❌ Background checks
- ❌ Credit checks
- ❌ Legal lease document generation (jurisdiction risk — requires legal partnership)
- ❌ Location-aware AI lease generation (post-scale, requires per-jurisdiction attorney review)
- ❌ E-signatures
- ❌ Legal compliance tools
- ❌ Tenant screening services

### Financial Records & Tax
- ❌ Expense receipt/invoice attachment to expense records (Sprint 3 / Phase 12)
- ❌ Tax-friendly annual export (income + expenses by category, for accountant handoff)
- ❌ Year-end PDF summary report
- ❌ Tax liability calculation (out of scope permanently — legal/jurisdiction risk)

### Lease Management
- ❌ Lease template storage and reuse (Phase 14 — document storage only, no generation)
- ❌ Lease renewal workflow with document duplication

### Communication
- ❌ Email automation
- ❌ In-app messaging
- ❌ Push notifications
- ❌ Notification center
- ❌ Automated reminders

### Advanced Maintenance
- ❌ Maintenance scheduling
- ❌ Vendor management
- ❌ Maintenance cost tracking
- ❌ Recurring maintenance reminders

## Mock Data Simulation (MVP)

### What Mock Data Simulates

**Automated Rent Collection UI/UX:**
- Payment statuses clearly displayed (paid, pending, overdue)
- Financial trends showing realistic patterns
- Charts demonstrating what automated collection would look like
- Visual states that build trust and demonstrate value

**Power-User Scale:**
- Multiple properties (3+)
- Multiple tenants per property
- 12+ months of historical data
- Varied transaction types
- Realistic status distributions

**Historical Data:**
- Rent records spanning 12+ months
- Expense records across multiple months
- Maintenance requests in various states
- Notes on multiple entities
- Realistic payment patterns (early, on-time, late)

### What Mock Data Does NOT Do

- ❌ Process actual payments
- ❌ Connect to real payment processors
- ❌ Require compliance or KYC
- ❌ Handle real money transfers

Mock data simulates the **experience** of automated rent collection without the complexity of real payment processing.

## Key Principles

### MVP Must Feel Complete
Every MVP feature should feel fully functional and polished. No "coming soon" placeholders or incomplete implementations.

### Mock Data Enables Realistic Testing
Mock data allows us to test engagement, UI/UX, and workflow adoption without compliance headaches. Users can see what the app would look like with real data.

### Empty Screens Are Failures
Unless intentionally designed (e.g., "no properties yet" for a new user), empty screens indicate incomplete implementation. Mock data should populate the app by default.

### Post-MVP Is Documented, Not Promised
Post-MVP features are documented for planning purposes but are not commitments. Priorities may shift based on user feedback.

## Success Criteria

MVP is complete when:
- ✅ All MVP features are fully functional
- ✅ Mock data simulates active power-user account
- ✅ Charts show realistic data with smooth interactions
- ✅ No empty screens unless intentionally designed
- ✅ App feels "easier than spreadsheets, lighter than Buildium"
- ✅ Users can replace their spreadsheet immediately

## Relationship to Other Documents

- **[product_philosophy.md](./product_philosophy.md)** — Core product values and positioning
- **[scope_guardrails.md](./scope_guardrails.md)** — Detailed scope boundaries and rationale
- **[post_mvp_roadmap.md](./post_mvp_roadmap.md)** — Future features and roadmap
- **[mock_mode_philosophy.md](./mock_mode_philosophy.md)** — Mock data implementation details

