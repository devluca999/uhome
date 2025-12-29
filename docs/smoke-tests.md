# Smoke Tests — haume

Post-deployment verification checklist. Run these tests after deploying to production.

## Authentication Tests

### Sign Up Flow
1. Navigate to `/signup`
2. Select "Landlord" role
3. Enter email and password
4. Submit form
5. ✅ Should redirect to `/landlord/dashboard`
6. ✅ User should be authenticated

### Sign In Flow
1. Navigate to `/login`
2. Enter valid credentials
3. Submit form
4. ✅ Should redirect to appropriate dashboard
5. ✅ User should be authenticated

### Sign Out Flow
1. While authenticated, click "Sign out"
2. ✅ Should redirect to `/login`
3. ✅ User should be logged out
4. ✅ Protected routes should redirect to login

### OAuth Flow (if enabled)
1. Click "Sign in with Google"
2. ✅ Should redirect to Google
3. ✅ After authorization, should return to app
4. ✅ Should redirect to appropriate dashboard

## Landlord Feature Tests

### Property Management
1. Navigate to `/landlord/properties`
2. Click "Add Property"
3. Fill form and submit
4. ✅ Property should appear in list
5. ✅ Click property card → should show detail view
6. ✅ Click "Edit Property" → should show edit form
7. ✅ Update property → should save changes
8. ✅ Click "Delete" → should remove property

### Tenant Management
1. Navigate to `/landlord/tenants`
2. Click "Add Tenant"
3. Search for user email
4. Select property and dates
5. Submit form
6. ✅ Tenant should appear in list
7. ✅ Tenant card should show correct info
8. ✅ Delete tenant → should remove from list

### Maintenance Requests
1. Navigate to `/landlord/maintenance`
2. ✅ Should show all maintenance requests
3. ✅ Requests grouped by status
4. ✅ Click "Mark In Progress" → status should update
5. ✅ Click "Mark Complete" → status should update

### Documents
1. Navigate to `/landlord/documents`
2. Select a property
3. Upload a document
4. ✅ Document should appear in list
5. ✅ Click "View/Download" → should open document
6. ✅ Click delete → should remove document

## Tenant Feature Tests

### Dashboard
1. Sign in as tenant
2. Navigate to `/tenant/dashboard`
3. ✅ Should show property information
4. ✅ Should show rent status
5. ✅ Should show maintenance count
6. ✅ Should show house rules (if set)

### Maintenance Requests
1. Navigate to `/tenant/maintenance`
2. Click "New Request"
3. Fill form and submit
4. ✅ Request should appear in list
5. ✅ Status should show as "pending"
6. ✅ Can view request details

### Documents
1. Navigate to `/tenant/documents`
2. ✅ Should show documents for assigned property
3. ✅ Click "Download" → should download/open document
4. ✅ Empty state if no documents

## Security Tests

### Route Protection
1. While logged out, try to access `/landlord/dashboard`
2. ✅ Should redirect to `/login`
3. Sign in as tenant, try to access `/landlord/dashboard`
4. ✅ Should redirect to `/tenant/dashboard`
5. Sign in as landlord, try to access `/tenant/dashboard`
6. ✅ Should redirect to `/landlord/dashboard`

### Data Access
1. As tenant, verify can only see own property data
2. As landlord, verify can see all own properties
3. ✅ Tenants cannot access other tenants' data
4. ✅ Landlords cannot access other landlords' data

## PWA Tests

### Installability
1. Open app in Chrome/Edge
2. ✅ Should show install prompt
3. Install app
4. ✅ Should open as standalone app
5. ✅ Should have app icon
6. ✅ Should have app name

### Manifest
1. Navigate to `/manifest.webmanifest`
2. ✅ Should return valid JSON
3. ✅ Should include all required fields
4. ✅ Icons should be accessible

### Service Worker
1. Open DevTools → Application → Service Workers
2. ✅ Service worker should be registered
3. ✅ Should show "activated and running"

## Performance Tests

### Build Size
1. Check build output
2. ✅ Main bundle < 500KB gzipped
3. ✅ CSS < 30KB gzipped
4. ✅ Total assets reasonable

### Load Time
1. Open app in production
2. ✅ Initial load < 3 seconds
3. ✅ Navigation is instant
4. ✅ No layout shift

## Browser Tests

### Desktop
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)

### Mobile
- [ ] iOS Safari
- [ ] Chrome Mobile
- [ ] PWA installability

## Error Handling Tests

### Network Errors
1. Disconnect network
2. Try to submit form
3. ✅ Should show error message
4. ✅ Should not crash app

### Invalid Data
1. Try to submit invalid form data
2. ✅ Should show validation errors
3. ✅ Should not submit invalid data

### Missing Data
1. Navigate to property detail with invalid ID
2. ✅ Should show "not found" message
3. ✅ Should not crash

## Quick Test Script

Run these in browser console after deployment:

```javascript
// Test 1: Check environment variables
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing')
console.log('Anon Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing')

// Test 2: Check PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    console.log('Service Workers:', regs.length > 0 ? '✅ Registered' : '❌ Not registered')
  })
}

// Test 3: Check manifest
fetch('/manifest.webmanifest')
  .then(r => r.json())
  .then(m => console.log('Manifest:', m.name ? '✅ Valid' : '❌ Invalid'))
  .catch(e => console.log('Manifest:', '❌ Error'))
```

## Critical Path Tests

**Must Pass Before Launch:**
1. ✅ Users can sign up and sign in
2. ✅ Landlords can create properties
3. ✅ Landlords can add tenants
4. ✅ Tenants can submit maintenance requests
5. ✅ Landlords can update maintenance status
6. ✅ Protected routes work correctly
7. ✅ PWA is installable

## Notes

- Run these tests in production environment
- Test with real Supabase project
- Verify all environment variables are set
- Check browser console for errors
- Test on multiple devices if possible

