# Production Deployment Checklist — uhome

Use this checklist when deploying to production for the first time.

## Pre-Deployment

### Backup
- [ ] Database backup taken (see [docs/backup-recovery.md](backup-recovery.md))

### Code
- [x] All code committed and pushed to main branch
- [x] CI/CD passing (lint, type-check, build)
- [x] No console errors in production build
- [x] Build output verified (`dist/` folder)

### Environment Variables
- [ ] `VITE_SUPABASE_URL` set in hosting platform
- [ ] `VITE_SUPABASE_ANON_KEY` set in hosting platform
- [ ] Variables verified in hosting dashboard
- [ ] Variables set for Production environment

### Supabase
- [x] Database schema deployed (`supabase/schema.sql`)
- [x] RLS policies active
- [ ] Entity audit log migration applied (`supabase/migrations/add_entity_audit_log.sql`)
- [ ] Storage bucket created (`documents`)
- [ ] Storage RLS policies configured (if using private storage)
- [ ] OAuth redirect URLs configured:
  - [ ] Production: `https://your-domain.com/auth/callback`
  - [ ] Development: `http://localhost:5173/auth/callback` (if needed)

### Hosting Platform
- [ ] Account created
- [ ] Repository connected
- [ ] Build settings configured:
  - Build command: `npm run build`
  - Output directory: `dist`
  - Node version: `20`
  - Install command: `npm ci --legacy-peer-deps`
- [ ] Environment variables set
- [ ] Custom domain configured (if applicable)
- [ ] SSL/HTTPS enabled

## Deployment

1. [ ] Trigger deployment (push to main or manual deploy)
2. [ ] Wait for build to complete
3. [ ] Verify build succeeded
4. [ ] Note deployment URL

## Post-Deployment Verification

### Basic Checks
- [ ] App loads at deployment URL
- [ ] No console errors
- [ ] HTTPS is working
- [ ] All assets load correctly

### Authentication
- [ ] Can access `/login`
- [ ] Can access `/signup`
- [ ] Can sign up as landlord
- [ ] Can sign up as tenant
- [ ] Can sign in
- [ ] Sign out works

### PWA
- [ ] Manifest accessible at `/manifest.webmanifest`
- [ ] Service worker registers (check DevTools)
- [ ] App is installable
- [ ] Icons display correctly

### Core Features
- [ ] Landlord can create property
- [ ] Landlord can view properties
- [ ] Landlord can add tenant
- [ ] Tenant can submit maintenance request
- [ ] Landlord can update maintenance status

### Security
- [ ] Unauthenticated users redirected to login
- [ ] Tenants cannot access landlord routes
- [ ] Landlords cannot access tenant routes

## Monitoring

- [ ] Check deployment logs for errors
- [ ] Monitor first few user actions
- [ ] Check Supabase logs for errors
- [ ] Verify no 404 errors in network tab

## Rollback Plan

- [ ] Know how to rollback in hosting platform
- [ ] Previous version accessible
- [ ] Database state is safe (no destructive migrations)

## Sign-Off

- [ ] All critical features working
- [ ] No blocking errors
- [ ] Performance acceptable
- [ ] Ready for users

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Deployment URL:** _______________

