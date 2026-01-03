# Design Philosophy — uhome

## Core Principle

**Tools don't have to be bland or boring to be serious.**

uhome prioritizes calm clarity, human-friendly language, and responsive interaction over analytical depth or feature overload. The product should feel like a lite landlord CRM, not an accounting system.

## Product Values

For high-level product values and principles, see [product_principles.md](./product_principles.md). This document focuses on design and interaction patterns that support those values.

Key product values that inform design:
- **Cohesion over feature count**: Connected workflows over disconnected features
- **Calm, intuitive workflows**: Natural, minimal cognitive effort
- **Opinionated defaults**: Smart choices that reduce decision fatigue
- **No orphaned data**: All data visible and useful, information flows between features
- **Property-first mental model**: Organized around properties, not accounting logic

## Guiding Principles

1. **Financial clarity > financial complexity**
   - Use plain language over accounting jargon
   - Show "This property kept ~82% of its rent" instead of "Net margin: 82.3%"
   - Make financial data immediately comprehensible

2. **Motion confirms intent, never distracts**
   - Animate state changes, not page loads
   - Motion should reinforce understanding, not draw attention
   - Duration: 150-250ms
   - Easing: ease-out or soft spring
   - Respect reduced-motion preferences

3. **Defaults should do most of the thinking**
   - Smart defaults reduce cognitive load
   - Pre-fill forms with sensible values
   - Auto-save where appropriate
   - Reduce required decisions

4. **The UI should feel like it's listening, not talking**
   - Respond immediately to user actions
   - Show loading states (skeleton loaders, not spinners)
   - Provide feedback for all interactions
   - Feel responsive and alive

5. **uhome does not try to do everything — it tries to feel right**
   - Focus on validated landlord pain points
   - Avoid feature creep
   - Maintain calm clarity
   - Differentiate through design and interaction

## Motion & Interaction Philosophy

### Animation Rules
- **Duration**: 150-250ms for most interactions
- **Easing**: ease-out or soft spring (use existing motion tokens)
- **Respect reduced-motion**: Check `prefers-reduced-motion` and disable animations when needed
- **No decorative animation**: No looping, pulsing, or attention-grabbing effects

### Required Interactions
- **Hover effects**: Subtle background lift, cursor changes, shadow bloom
- **State transitions**: Smooth fade + slide for filtering, date range changes
- **Expand/collapse**: Smooth height animation with AnimatePresence
- **Number animations**: Count up/down when values change
- **Loading states**: Skeleton loaders instead of spinners

### What to Animate
- State changes (filters, date ranges, expand/collapse)
- Value updates (number counting)
- List item additions/removals
- Modal/dialog entrances

### What NOT to Animate
- Page loads
- Initial page renders (except subtle fade-in)
- Decorative elements
- Looping or pulsing effects

## Anti-Patterns (What NOT to Do)

### No hidden workarounds
Users should never need to find clever ways to accomplish basic tasks. Core functionality should be directly accessible.

### No forced accounting logic
Present financial information in plain language that landlords understand naturally, not accounting terminology.

### No multi-step flows for simple actions
Common, simple tasks should be achievable in one or two steps.

### No help articles required for core tasks
Core functionality should be self-evident. If documentation is needed for basic tasks, the design has failed.

## Language & Clarity Standards

### Use Human-Friendly Language
- ✅ "This property kept ~82% of its rent"
- ❌ "Net margin: 82.3%"

- ✅ "You've collected 96% of expected rent this month"
- ❌ "Collection rate: 96%"

- ✅ "This unit has been late 3 times in the last 6 months"
- ❌ "Late payment frequency: 0.5/month"

### Avoid Accounting Jargon
- ❌ "Accounts receivable"
- ❌ "Net operating income"
- ❌ "Depreciation"
- ❌ "Amortization"

### Use Plain Language
- ✅ "Rent collected"
- ✅ "Upkeep costs"
- ✅ "Net profit"
- ✅ "Upcoming rent"

## Visual Design Principles

### Calm Clarity
- Clean, uncluttered interfaces
- Clear visual hierarchy
- Sufficient whitespace
- Glassmorphic surfaces for depth

### Responsive Interaction
- Immediate feedback on all actions
- Hover states that feel alive
- Smooth transitions between states
- Loading states that don't block

### Premium Feel
- Subtle shadows and depth
- Reflective gradients
- Matte/grain textures
- Polished microinteractions

## Product Positioning

uhome is a **lite landlord CRM**, not:
- An accounting system
- A payment processor
- A legal document generator
- An analytics platform
- A tenant screening service

uhome replaces:
- Word documents for receipts
- Excel spreadsheets for ledgers
- Scattered notes and mental tracking

uhome provides:
- Rent receipts (PDF)
- Rent ledgers (interactive)
- Expense tracking (lightweight)
- Financial clarity (human-friendly)
- Notes system (simple, powerful)

## Decision Framework

When evaluating features or design decisions, ask:

1. Does it solve a validated landlord pain point?
2. Does it maintain calm clarity?
3. Does it avoid compliance complexity?
4. Can it be built in MVP timeframe?
5. Does it differentiate through design/interaction?

If any answer is "no", defer to post-MVP.

## Property-First Mental Model

uhome is organized around properties and relationships, not accounting concepts. The system supports:
- Property-centric navigation and workflows
- Relationships between landlords, tenants, and properties as the primary structure
- Financial tracking that supports the property model, not dictates it

This mental model ensures the product feels like a landlord CRM, not accounting software. All features should align with this property-first approach.

