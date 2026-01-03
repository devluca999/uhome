# Scope Guardrails — uhome MVP

## Purpose

This document defines explicit boundaries for the uhome MVP to prevent scope creep and maintain focus on validated landlord pain points.

## Explicitly Excluded from MVP

### Payment Processing
- ❌ Rent payment processing
- ❌ Stripe Connect integration
- ❌ Plaid integration
- ❌ Payment gateway setup
- ❌ Automated rent collection
- ❌ Payment disputes handling

**Rationale**: Compliance-heavy, requires KYC, regulatory complexity. Deferred to post-MVP.

### Legal & Compliance
- ❌ Background checks
- ❌ Credit checks
- ❌ Legal lease document generation
- ❌ E-signatures
- ❌ Legal compliance tools
- ❌ Tenant screening services

**Rationale**: Requires legal expertise, compliance overhead, third-party integrations. Not core MVP value.

### Advanced Analytics
- ❌ Forecasting
- ❌ Predictive analytics
- ❌ Advanced reporting
- ❌ Multi-axis charts
- ❌ Stacked visualizations
- ❌ Trend analysis beyond basic insights

**Rationale**: Adds complexity without solving core pain points. Basic insights sufficient for MVP.

### Data Import/Export
- ❌ CSV imports
- ❌ Bulk data import
- ❌ Excel file parsing
- ❌ Data migration tools

**Rationale**: Nice-to-have, not core MVP. Manual entry acceptable for MVP launch.

### Automations
- ❌ Automated workflows with side effects
- ❌ Scheduled tasks
- ❌ Email automation
- ❌ Notification automation (beyond basic)

**Rationale**: Adds complexity and potential failure points. Manual processes acceptable for MVP.

### Advanced Features
- ❌ Tax report generation
- ❌ Accounting software integration
- ❌ Multi-currency support (beyond display)
- ❌ Split payments (roommates)
- ❌ Late fee automation
- ❌ Recurring payment setup

**Rationale**: Post-MVP features. Focus on core ledger and receipt functionality first.

## Decision Framework

When evaluating a new feature request, ask these questions in order:

### 1. Does it solve a validated landlord pain point?
- ✅ Replaces Word/Excel workflows
- ✅ Provides instant financial clarity
- ✅ Saves time on manual tasks
- ❌ Nice-to-have convenience
- ❌ "Would be cool" feature

### 2. Does it maintain calm clarity?
- ✅ Simple, human-friendly language
- ✅ Clear visual hierarchy
- ✅ No cognitive overload
- ❌ Adds complexity
- ❌ Requires explanation

### 3. Does it avoid compliance complexity?
- ✅ No payment processing
- ✅ No legal document generation
- ✅ No KYC/AML requirements
- ❌ Requires legal review
- ❌ Regulatory compliance needed

### 4. Can it be built in MVP timeframe?
- ✅ 1-2 weeks implementation
- ✅ No major infrastructure changes
- ✅ Fits existing architecture
- ❌ Requires new systems
- ❌ 3+ weeks development

### 5. Does it differentiate through design/interaction?
- ✅ Better UX than Excel/Word
- ✅ Feels premium and responsive
- ✅ Motion and interaction enhance clarity
- ❌ Generic SaaS feature
- ❌ No design differentiation

## Decision Examples

### ✅ Include: Rent Receipt PDF Generation
- **Pain point**: Replaces Word documents
- **Clarity**: Simple download button
- **Compliance**: No legal complexity (descriptive receipt)
- **Timeline**: 1-2 weeks (Edge Function + PDF library)
- **Differentiation**: Customizable, branded receipts

### ✅ Include: Lease Metadata (Not Legal Documents)
- **Pain point**: Track lease terms without scattered notes
- **Clarity**: Simple form, clear summary
- **Compliance**: Descriptive only, no legal generation
- **Timeline**: 1 week (table + form)
- **Differentiation**: Clean, organized lease history

### ❌ Exclude: Automated Rent Collection
- **Pain point**: Yes, but...
- **Clarity**: Complex payment flows
- **Compliance**: Requires Stripe Connect, KYC, regulatory
- **Timeline**: 3-4 weeks minimum
- **Differentiation**: Generic payment processing

### ❌ Exclude: CSV Import
- **Pain point**: Minor convenience
- **Clarity**: Adds complexity to UI
- **Compliance**: No issues
- **Timeline**: 1-2 weeks
- **Differentiation**: Generic feature, not differentiating

## MVP vs Post-MVP Criteria

### MVP Features
- Solve validated pain points
- Replace Word/Excel workflows
- Provide instant financial clarity
- Can be built in 1-2 weeks
- Differentiate through design

### Post-MVP Features
- Nice-to-have conveniences
- Advanced analytics
- Payment processing
- Legal/compliance tools
- Complex automations

## Saying "No" Gracefully

When a feature request falls outside MVP scope:

1. **Acknowledge the need**: "I understand that [feature] would be valuable."
2. **Explain the boundary**: "For MVP, we're focusing on [core value]."
3. **Provide timeline**: "This is planned for post-MVP, after we validate the core features."
4. **Offer alternative**: "For now, you can [workaround]."

## Review Process

This document should be reviewed when:
- New feature requests arise
- Scope creep is detected
- MVP launch approaches
- Post-MVP planning begins

## Architecture Notes

### Organization/Workspace Model

**MVP Status**: The current architecture uses `properties.owner_id` directly, which is sufficient for MVP where UI exposes only a single landlord.

**Future Migration Path**: The architecture rule states "Use organization/workspace model internally, even if UI exposes only single landlord at MVP." While we maintain direct `owner_id` relationships for MVP simplicity, the schema can be migrated to an organization/workspace model later without breaking changes by:

1. Creating an `organizations` table
2. Adding `organization_id` to `properties` and other relevant tables
3. Migrating existing `owner_id` relationships to organization memberships
4. Updating RLS policies to work with organizations

This future-proofing consideration does not require changes at MVP, but should be kept in mind when designing new features.

## Updates

This document is a living guide. Update it when:
- New exclusions are identified
- Decision framework is refined
- MVP scope is clarified

