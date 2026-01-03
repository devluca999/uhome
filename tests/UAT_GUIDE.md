# UAT (User Acceptance Testing) Guide — uhome

## Overview

This guide outlines the User Acceptance Testing (UAT) process for uhome. UAT tests should run against a deployed staging instance using a separate Supabase staging project to ensure realistic testing conditions.

## Prerequisites

### Staging Environment Setup

1. **Supabase Staging Project**
   - Create a separate Supabase project for staging
   - Configure environment variables:
     - `VITE_SUPABASE_URL` (staging project URL)
     - `VITE_SUPABASE_ANON_KEY` (staging project anon key)
     - `SUPABASE_SERVICE_ROLE_KEY` (staging project service role key)

2. **Deployed Staging Instance**
   - Deploy staging build to hosting platform (Vercel, Netlify, etc.)
   - Ensure staging URL is accessible
   - Configure staging environment variables

3. **Test Data**
   - Run seed script on staging database: `npm run seed:mock`
   - Verify test credentials work:
     - Landlord: `landlord@example.com` / `password123`
     - Tenants: `tenant1@example.com` / `password123` (etc.)

## Test Execution

### Before Each Test Run

1. **Clean Up Data**
   - Reset staging database (optional: use Supabase reset or manual cleanup)
   - Re-seed mock data if needed
   - Clear browser cache and localStorage

2. **Verify Environment**
   - Confirm staging URL is accessible
   - Verify Supabase connection
   - Check that mock data exists

### Test Scenarios

#### Landlord Workflows

**Property Management:**
- [ ] Create new property
- [ ] Update property details
- [ ] Delete property
- [ ] View property list
- [ ] Filter/search properties

**Tenant Management:**
- [ ] Create tenant assignment
- [ ] Update tenant information
- [ ] Delete tenant
- [ ] Send tenant invite
- [ ] View tenant list

**Rent Tracking:**
- [ ] Create rent record
- [ ] Update rent record status
- [ ] Mark rent as paid
- [ ] Generate receipt
- [ ] View rent ledger
- [ ] Filter rent records by property/date

**Expense Tracking:**
- [ ] Create expense
- [ ] Update expense
- [ ] Delete expense
- [ ] View expense list
- [ ] Filter expenses by category/date

**Maintenance Requests:**
- [ ] View maintenance requests
- [ ] Update request status (pending → in_progress → completed)
- [ ] Create task from work order
- [ ] View request details

**Financial Dashboard:**
- [ ] View financial metrics
- [ ] Check charts render with data (no empty states)
- [ ] Switch between chart types (line, bar, donut, pie)
- [ ] Change date ranges (month, quarter, year)
- [ ] Verify chart tooltips work
- [ ] Verify chart animations are smooth

**Notes:**
- [ ] Create note on property
- [ ] Create note on rent record
- [ ] Edit note
- [ ] Delete note
- [ ] Verify notes persist after navigation
- [ ] Verify notes persist after page refresh

#### Tenant Workflows

**Property Access:**
- [ ] View assigned property
- [ ] View property details
- [ ] View rent records
- [ ] View maintenance requests

**Maintenance Requests:**
- [ ] Create maintenance request
- [ ] View request status
- [ ] Update request description (if allowed)

**Rent Viewing:**
- [ ] View rent history
- [ ] View upcoming rent
- [ ] View payment status

## UI/UX Validation

### Visual Checks

**Dark Mode:**
- [ ] All pages render correctly in dark mode
- [ ] Text is legible (no low contrast)
- [ ] No pure black backgrounds (layered dark shades)
- [ ] Depth is visible (elevation, shadows)
- [ ] Cards have proper contrast

**Status Pills:**
- [ ] Status badges are high contrast
- [ ] Text is legible
- [ ] Status is clear at a glance
- [ ] Colors are appropriate (yellow for pending, blue for in_progress, green for completed)

**Charts:**
- [ ] Charts show realistic data (no empty states by default)
- [ ] Chart tooltips display correctly
- [ ] Chart animations are smooth
- [ ] Date range changes animate smoothly
- [ ] All chart types render correctly

**Empty States:**
- [ ] Empty states only appear when appropriate (e.g., "no properties yet" for new user)
- [ ] Empty states are not shown when mock data exists
- [ ] Empty states are intentionally designed, not errors

### Interaction Checks

**Hover States:**
- [ ] Buttons have hover feedback
- [ ] Cards have hover elevation
- [ ] Interactive elements show hover states
- [ ] Hover states are subtle and not distracting

**Animations:**
- [ ] Page transitions are smooth (150-250ms)
- [ ] Status changes animate smoothly
- [ ] Form submissions show feedback
- [ ] Chart data updates animate
- [ ] Animations respect reduced-motion preferences

**Responsiveness:**
- [ ] App works on mobile devices
- [ ] Navigation is accessible
- [ ] Forms are usable on small screens
- [ ] Charts are readable on mobile

## Data Persistence

### Notes Persistence
- [ ] Notes save immediately
- [ ] Notes persist after navigation
- [ ] Notes persist after page refresh
- [ ] Notes appear in correct entity context

### Form Data
- [ ] Form submissions show success feedback
- [ ] Data appears immediately after creation
- [ ] Updates reflect immediately
- [ ] Deletions remove items immediately

## Mock Data Validation

### Power-User Simulation
- [ ] App shows 12+ months of historical data
- [ ] Multiple properties are visible
- [ ] Multiple tenants are visible
- [ ] Charts show realistic trends
- [ ] Financial metrics are populated
- [ ] No placeholder sequences ("Item 1", "Item 2")

### Data Variety
- [ ] Payment statuses vary (paid, pending, overdue)
- [ ] Payment methods vary (Zelle, Cash, Check, etc.)
- [ ] Expense categories are diverse
- [ ] Maintenance requests have various statuses
- [ ] Notes exist on multiple entities

## Visual Regression Testing

### Screenshots to Capture
- [ ] Dashboard (landlord)
- [ ] Properties page
- [ ] Finances page (all chart types)
- [ ] Operations page (maintenance requests)
- [ ] Tenant dashboard
- [ ] Dark mode versions of all pages

### What to Check
- [ ] No broken layouts
- [ ] No unreadable text
- [ ] No overlapping elements
- [ ] No missing images/icons
- [ ] Consistent spacing and alignment

## CI/CD Integration

### Automated UAT Tests

**When to Run:**
- On every PR to main branch
- On every push to main branch
- Before production deployment

**Test Execution:**
```bash
# Run UAT tests against staging
npm run test:uat

# Or with Playwright/Cypress
npm run test:e2e:staging
```

**Test Cleanup:**
- Automated cleanup between test runs
- Reset test data if needed
- Clear browser state

### Manual UAT Checklist

Before marking MVP as complete, manually verify:
- [ ] All MVP features work as expected
- [ ] Mock data simulates active power-user account
- [ ] Charts show realistic data with smooth interactions
- [ ] Notes persist correctly
- [ ] Dark mode is polished and legible
- [ ] Status pills are clear and high-contrast
- [ ] Animations enhance comprehension without distraction
- [ ] App feels "easier than spreadsheets, lighter than Buildium"
- [ ] No empty screens unless intentionally designed
- [ ] All features appear fully functional

## Test Data Cleanup

### Between Test Runs

1. **Database Cleanup:**
   - Option 1: Reset staging database (Supabase dashboard)
   - Option 2: Delete test data manually
   - Option 3: Re-seed mock data (overwrites existing)

2. **Browser Cleanup:**
   - Clear localStorage
   - Clear sessionStorage
   - Clear cookies
   - Hard refresh (Ctrl+Shift+R)

3. **Authentication:**
   - Log out between test runs
   - Use fresh test accounts

## Reporting Issues

### Issue Template

When reporting UAT issues, include:
- **Test Scenario:** What workflow was being tested
- **Expected Behavior:** What should have happened
- **Actual Behavior:** What actually happened
- **Steps to Reproduce:** Detailed steps
- **Screenshots:** If applicable
- **Environment:** Browser, OS, staging URL
- **Console Errors:** Any errors in browser console

### Priority Levels

- **P0 (Critical):** Blocks core functionality
- **P1 (High):** Major feature broken
- **P2 (Medium):** Minor issue, workaround exists
- **P3 (Low):** Cosmetic issue

## Success Criteria

UAT is successful when:
- ✅ All test scenarios pass
- ✅ UI/UX validation passes
- ✅ Data persistence works correctly
- ✅ Mock data simulates active account
- ✅ No critical issues found
- ✅ App feels ready for real users

## Notes

- UAT should be run by someone other than the developer
- Test with fresh eyes (don't assume knowledge of the app)
- Test on multiple browsers (Chrome, Firefox, Safari)
- Test on multiple devices (desktop, tablet, mobile)
- Document any issues found for follow-up

