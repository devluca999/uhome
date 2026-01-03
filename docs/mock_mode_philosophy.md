# Mock Mode Philosophy — uhome

## Overview

Mock mode in uhome is not a placeholder or demo mode. It is a **realistic simulation of an active power user account** that demonstrates the full potential of the application.

**Key Principle:** Mock data simulates automated rent collection UI/UX (payment statuses, trends, visual states) without requiring actual payment processing. This allows us to test engagement, UI/UX, and workflow adoption without compliance headaches.

## Core Principles

### 1. Realistic Simulation, Not Placeholder Data

Mock data should:
- Represent a landlord or tenant with **active, ongoing operations**
- Show **meaningful scale** (multiple properties, months of history, varied transactions)
- Demonstrate **real-world usage patterns** (early payments, late payments, various expense types)
- Communicate **momentum and trust** through data richness

### 2. Full Feature Demonstration

Every visible feature must:
- **Appear fully functional** — no broken or non-functional UI elements
- **Show realistic data** — not "1, 2, 3" placeholder sequences
- **Respond correctly** to user interactions
- **Persist changes** in local state and survive navigation

### 3. Power User Account Simulation

Mock data should simulate:
- **Multiple properties** (3+ properties)
- **12+ months of historical data** (rent records, expenses)
- **Varied transaction types** (different payment methods, expense categories)
- **Mixed statuses** (paid, pending, overdue records)
- **Completed and in-progress items** (maintenance requests, tasks)
- **Realistic distributions** (not uniform or sequential data)

### 4. Visual Credibility

The app should feel:
- **Alive and in active use** — not an empty demo
- **Professional and trustworthy** — data suggests real operations
- **Comprehensive** — full dashboards, populated lists, meaningful metrics
- **Engaging** — charts show trends, insights are relevant

## Implementation Guidelines

### Data Seeding

The seed script (`scripts/seed-mock-data.ts`) creates:
- **3 properties** with varied rent amounts and details
- **3 tenants** assigned to properties
- **12 months of rent records** per tenant with:
  - Variety in payment dates (early, on-time, late)
  - Mix of payment methods (Zelle, Cash, Check, Venmo, Bank Transfer)
  - Realistic status distribution (mostly paid, some pending)
- **15-20 expense records** across 12 months with:
  - Multiple categories (maintenance, utilities, repairs, insurance, taxes)
  - Realistic amounts ($50-$700 range)
  - Some recurring expenses
- **5+ maintenance requests** in various states
- **2-3 notes per property** plus notes on some rent records and expenses

### UI Behavior

All features must:
- **Save correctly** — data persists in state immediately
- **Show feedback** — loading states, success indicators, error handling
- **Survive navigation** — data remains after page changes
- **Display meaningfully** — charts show data, lists are populated, metrics are realistic

### Fallback Data

If seed data is unavailable, the app should:
- Generate **client-side fallback mock data** for charts and metrics
- Only use fallbacks when **no real data exists**
- Maintain **realistic distributions** in fallback data
- Ensure **charts always render** with visible data (not empty states by default)

## Automated Rent Collection Simulation

### What We Simulate
Mock data simulates the **UI/UX experience** of automated rent collection:
- Payment statuses (paid, pending, overdue) with realistic distributions
- Financial trends showing what automated collection patterns would look like
- Visual states that demonstrate value and build trust
- Charts and metrics that show the benefits of automation

### What We Don't Do
- ❌ Process actual payments
- ❌ Connect to real payment processors
- ❌ Require compliance or KYC
- ❌ Handle real money transfers

**Why This Works:** Users can see and experience what automated rent collection would look like, building trust and demonstrating value, without the complexity of real payment processing. This is perfect for MVP testing and user engagement.

## Anti-Patterns (What to Avoid)

- ❌ Empty dashboards or lists by default
- ❌ Placeholder sequences ("Item 1", "Item 2", "Item 3")
- ❌ Broken or non-functional UI elements
- ❌ Data that disappears after save actions
- ❌ Charts showing empty states when data should exist
- ❌ Features that appear incomplete or "coming soon"
- ❌ Empty screens unless intentionally designed (e.g., "no properties yet" for new users)

## Success Criteria

Mock mode is successful when:
- ✅ A new user can explore the app and see realistic, populated data
- ✅ All features appear fully functional and responsive
- ✅ Charts and metrics show meaningful, varied data
- ✅ The app feels like an active, professional account
- ✅ No features appear broken, empty, or misleading
- ✅ Save actions provide immediate feedback and persistence

## Documentation

- **Seed Script**: `scripts/seed-mock-data.ts` — Creates comprehensive mock data
- **Seed Documentation**: `scripts/README.md` — How to run and refresh mock data
- **Fallback Data**: `src/pages/landlord/finances.tsx` — Client-side fallback generation

## Philosophy Summary

> **Mock mode = Realistic simulation of an active account**
>
> The goal is not to show a demo, but to demonstrate what the app looks like when it's actively being used by a power user. Every feature should feel real, functional, and credible.
>
> **Empty screens are failures unless intentionally designed.** The app should always show realistic, populated data that demonstrates active usage. Mock data simulates automated rent collection UI/UX to show value without compliance complexity.

