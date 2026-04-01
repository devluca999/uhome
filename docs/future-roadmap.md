# Future Roadmap — uhome

> Last updated: April 2026 — P2 CTO review  
> Items marked 🆕 were added in the April 2026 planning session.

---

## Post-MVP Priorities

### Phase 8: Subscription & Billing ✅ Complete
**Goal:** Enable SaaS revenue model

**Features:**
- Stripe subscription integration
- Subscription tier enforcement
- Billing management page
- Usage limit tracking
- Upgrade/downgrade flows

---

### Phase 9: Rent Collection
**Goal:** Enable in-app rent payments

**Features:**
- Stripe Connect integration
- Connect account onboarding
- Rent payment flow (one-time)
- Payment history & receipts
- Automatic rent record updates

**Timeline:** 3-4 weeks

**Dependencies:**
- Phase 8 complete ✅
- Stripe Connect setup

---

### Phase 10: Notifications
**Goal:** Improve communication between landlords and tenants

**Features:**
- Email notifications (rent due, maintenance updates)
- In-app notification center
- Push notifications (via PWA)
- Notification preferences

**Timeline:** 2 weeks

**Dependencies:**
- Email service (Resend — already partially integrated)

---

### Phase 11: Advanced Rent Features
**Goal:** Automate rent collection and tracking

**Features:**
- Recurring automatic rent collection
- Payment reminders
- Late fee calculation
- Payment disputes
- Multi-currency support

**Timeline:** 3-4 weeks

**Dependencies:**
- Phase 9 complete (rent collection)

---

### Phase 12: Data Utilities & Tax Exports 🆕
**Goal:** Help landlords close the shoebox — all financial records in one place, exportable for tax season

**Features:**
- CSV export for properties, tenants, rent records, expenses
- Tax-friendly annual summary (income + expenses grouped by category and year, formatted for accountant handoff)
- Expense receipt/invoice attachment — landlords can attach a PDF or image to any expense record as supporting evidence
- Year-end PDF summary report with property breakdown
- Audit trail

**Scope note:** uhome does not calculate tax liability. Tax calculations require knowing jurisdiction, ownership structure, and depreciation schedules. The export is formatted for an accountant to use — it does not replace one.

**Timeline:** 2-3 weeks

---

### Phase 13: Enhanced Analytics
**Goal:** Provide deeper insights to landlords

**Features:**
- Property performance dashboard
- Rent collection analytics
- Maintenance trends
- Tenant retention metrics
- Revenue forecasting
- Custom date range picker for all metric views (architecture already supports arbitrary date ranges in useFinancialMetrics)

**Timeline:** 3-4 weeks

**Dependencies:**
- Phase 11 complete (rent data)

---

### Phase 14: Lease Template Storage & Reuse 🆕
**Goal:** Reduce friction for lease renewals and new tenants without incurring legal liability

**Features:**
- Landlords can upload their own lease document (PDF) and tag it to a property
- When renewing a lease, duplicate the existing document record and attach to the new lease — no manual re-upload
- For new tenants, create a fresh document record with "Based on [previous lease]" reference
- No AI generation, no clause suggestions — storage and reuse only

**Why this scope, not full generation:**  
Generating legally binding lease documents requires jurisdiction-specific compliance. A lease missing a required clause in Illinois or California creates liability for uhome. This feature solves the real pain (re-uploading the same document every year) without touching legal territory.

**Future consideration:** Location-aware AI lease generation. Requires a legal content partnership or per-jurisdiction attorney review. Out of scope until legal counsel is engaged.

**Timeline:** 1-2 weeks

**Dependencies:**
- Document storage already exists ✅
- No new DB schema required

---

### Phase 15: Mobile Optimization
**Goal:** Improve mobile experience

**Features:**
- Responsive design polish
- Mobile-specific UI improvements
- Touch gesture optimizations
- Offline data caching

**Timeline:** 2-3 weeks

---

### Phase 16: React Native App
**Goal:** Native mobile apps

**Features:**
- React Native iOS app
- React Native Android app
- Shared component library
- Platform-specific optimizations

**Timeline:** 6-8 weeks

**Dependencies:**
- Architecture designed for RN parity ✅
- Mobile optimization complete

---

## Legal & Compliance Roadmap 🆕

These items are non-negotiable before reaching scale. Tracked separately because they require human judgment, not just engineering.

### Terms of Service & Privacy Policy (Sprint 3 — urgent)
- Both pages are live at `/terms` and `/privacy`
- Must accurately cover: data collection and storage, Stripe payment processing disclosure, account deletion rights (GDPR/CCPA), and — critically — a disclaimer that uhome is not a legal document generator and does not provide legal or tax advice
- Engage legal counsel for review before marketing to a broad audience
- **Estimated cost:** $300–500 one-time legal review

### Key disclaimers to include explicitly:
- uhome does not generate, validate, or certify lease agreements
- uhome does not provide legal advice
- uhome does not provide tax advice or calculate tax liability
- Tax export features are for record-keeping and accountant handoff only
- Landlords are responsible for ensuring their lease documents comply with local law

### Future compliance considerations:
- GDPR data deletion flows (right to erasure)
- CCPA opt-out for California users
- Data residency options for EU landlords (post-scale)
- PCI DSS scope (currently handled entirely by Stripe — maintain this)

---

## Feature Ideas (Future Consideration)

### Communication
- Email automation (rent due reminders, maintenance updates)
- Announcements/bulletins to all tenants in a property
- Bulk messaging

### Documents
- Document versioning and history
- E-signatures (DocuSign or similar)
- Lease expiry reminders with renewal workflow

### Maintenance
- Maintenance scheduling
- Vendor management and contacts
- Maintenance cost tracking per property
- Recurring maintenance reminders

### Tenant Onboarding
- Move-in checklist (assignable tasks)
- Welcome packet (uploaded documents + house rules)
- Digital lease signing integration

### Financial
- Multiple bank account / payout method tracking
- Mortgage and loan tracking per property
- Depreciation tracking (accountant use)
- Market rent comparison (integrations)

### Advanced Features
- Multi-property portfolio analytics comparisons
- Tenant screening integration (3rd party)
- Background and credit check integration
- Location-aware features (property maps, commute times)

---

## Technical Debt & Improvements

### Known Issues (April 2026)
- [ ] Admin demo populated state broken — landlordDemoData.ts and tenantDemoData.ts exist but are not consumed by any hook. demoState toggle has no effect.
- [ ] dist/ directory committed to repo — needs git rm --cached
- [ ] deploy.yml Vercel step is a placeholder echo — CI does not gate deployments

### Performance
- [ ] Implement React Query for better caching
- [ ] Optimize bundle size (code splitting)
- [ ] Image optimization
- [ ] Database query optimization

### Developer Experience
- [ ] Dependabot for automated security patches
- [ ] Component Storybook
- [ ] Better error tracking (Sentry DSN confirmed in prod)
- [ ] Performance monitoring

### Security
- [ ] Branch protection on main (no direct pushes)
- [ ] Rate limiting on public API endpoints
- [ ] Enhanced audit logging
- [ ] Security headers (CSP, etc.)

---

## Timeline (Revised April 2026)

**Now (Sprints 2–3):**
- Sprint 2: Reliability, UX polish, demo data fix, messaging UI
- Sprint 3: GTM hardening, legal review, receipt attach, lease template storage scoping

**Post-launch (Q2 2026):**
- Phase 9: Rent Collection (Stripe Connect)
- Phase 10: Notifications
- Phase 12: Data Utilities & Tax Exports

**Q3 2026:**
- Phase 11: Advanced Rent Features
- Phase 13: Enhanced Analytics + custom date range picker
- Phase 14: Lease Template Storage & Reuse

**Q4 2026:**
- Phase 15: Mobile Optimization
- Phase 16: React Native (start)

---

## Success Metrics

### Business Metrics
- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Customer Lifetime Value (LTV)
- Churn rate
- Active properties / tenants

### Product Metrics
- Feature adoption rates
- Empty state conversion (onboarding → first property added)
- Payment success rate
- User satisfaction (NPS)
- Support ticket volume
- Error rates (Sentry)

---

## Notes

- Priorities shift based on user feedback — nothing here is a commitment
- Legal features (lease generation, tax calculation) require external review before shipping
- The tax export and receipt attachment features solve real user pain without creating liability
- uhome's liability disclaimer in T&C is the primary protection against lease/tax feature misuse
