# Future Roadmap — haume

## Post-MVP Priorities

### Phase 8: Subscription & Billing
**Goal:** Enable SaaS revenue model

**Features:**
- Stripe subscription integration
- Subscription tier enforcement
- Billing management page
- Usage limit tracking
- Upgrade/downgrade flows

**Timeline:** 2-3 weeks

**Dependencies:**
- Stripe account setup
- Serverless functions for webhooks

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
- Phase 8 complete
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
- Email service (SendGrid, Resend, etc.)
- PWA push notification setup

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

### Phase 12: Data Utilities
**Goal:** Enable data export and reporting

**Features:**
- CSV export for properties, tenants, rent records
- Financial reports (income, expenses)
- Tax-friendly exports
- Audit trail

**Timeline:** 1-2 weeks

---

### Phase 13: Enhanced Analytics
**Goal:** Provide insights to landlords

**Features:**
- Property performance dashboard
- Rent collection analytics
- Maintenance trends
- Tenant retention metrics
- Revenue forecasting

**Timeline:** 3-4 weeks

**Dependencies:**
- Phase 11 complete (rent data)

---

### Phase 14: Mobile Optimization
**Goal:** Improve mobile experience

**Features:**
- Responsive design polish
- Mobile-specific UI improvements
- Touch gesture optimizations
- Offline data caching

**Timeline:** 2-3 weeks

---

### Phase 15: React Native App
**Goal:** Native mobile apps

**Features:**
- React Native iOS app
- React Native Android app
- Shared component library
- Platform-specific optimizations

**Timeline:** 6-8 weeks

**Dependencies:**
- Architecture designed for RN parity
- Mobile optimization complete

---

## Feature Ideas (Future Consideration)

### Communication
- In-app messaging between landlord and tenant
- Maintenance request comments/updates
- Announcements/bulletins

### Documents
- Lease agreement templates
- Document signing (e-signatures)
- Document versioning

### Maintenance
- Maintenance scheduling
- Vendor management
- Maintenance cost tracking
- Recurring maintenance reminders

### Tenant Onboarding
- Self-service tenant signup
- Digital lease signing
- Move-in checklist
- Welcome guides

### Financial
- Expense tracking (landlord)
- Profit/loss reports
- Tax document generation
- Multiple bank account support

### Advanced Features
- Multi-property portfolio management
- Property analytics comparisons
- Market rate comparisons
- Tenant screening integration

---

## Technical Debt & Improvements

### Performance
- [ ] Implement React Query for better caching
- [ ] Optimize bundle size (code splitting)
- [ ] Image optimization
- [ ] Database query optimization

### Developer Experience
- [ ] E2E testing (Playwright/Cypress)
- [ ] Component Storybook
- [ ] Better error tracking (Sentry)
- [ ] Performance monitoring

### Security
- [ ] Rate limiting on API endpoints
- [ ] Enhanced audit logging
- [ ] Security headers (CSP, etc.)
- [ ] Penetration testing

---

## Timeline Estimate

**Q1 2024 (Post-MVP):**
- Phase 8: Subscription & Billing
- Phase 10: Notifications

**Q2 2024:**
- Phase 9: Rent Collection
- Phase 12: Data Utilities

**Q3 2024:**
- Phase 11: Advanced Rent Features
- Phase 13: Enhanced Analytics

**Q4 2024:**
- Phase 14: Mobile Optimization
- Phase 15: React Native Apps (start)

---

## Success Metrics

### Business Metrics
- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Customer Lifetime Value (LTV)
- Churn rate
- Active properties/tenants

### Product Metrics
- Feature adoption rates
- Payment success rate
- User satisfaction (NPS)
- Support ticket volume
- Error rates

---

## Notes

- Priorities may shift based on user feedback
- Timeline estimates are rough and subject to change
- Some features may be combined or split based on complexity
- User research will inform feature prioritization

