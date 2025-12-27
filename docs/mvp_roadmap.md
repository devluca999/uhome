# MVP Roadmap & Checklist — haume

## Phase 0 — Foundation & Technical Stack

### Documentation & Decisions
- [x] Repo initialized
- [x] Documentation established (project context, engineering rules, design direction)
- [x] UI reference locked (Lovable UI repo)
- [x] Framework decision: Vite + React (documented)
- [x] UI tooling decision: Tailwind + shadcn/ui (documented)
- [x] PWA strategy documented

### Boilerplate & Infrastructure
- [x] Vite + React project initialized
- [x] TypeScript configuration
- [x] React Router setup
- [x] Project folder structure (pages, components, lib, hooks)
- [x] Path aliases configured (@/ imports)

### UI Tooling Setup
- [x] Tailwind CSS configured with design tokens
- [x] shadcn/ui initialized (components.json)
- [x] Design token system (colors, shadows, glassmorphic utilities)
- [x] Base UI components scaffolded (Button, Card, Input)

### Environment & CI/CD
- [x] Environment variable handling (.env.example, .gitignore)
- [x] Supabase environment variables documented
- [x] GitHub Actions CI workflow (lint, format, type-check, build)
- [x] ESLint + Prettier configured

## Phase 1 — Core App Structure & PWA

### App Foundation
- [x] React Router configuration
- [x] Role-based route structure (landlord, tenant)
- [x] Root layout with providers
- [x] Landlord layout with navigation placeholder
- [x] Tenant layout with navigation placeholder
- [x] Supabase client setup (browser client)

### PWA Readiness
- [x] vite-plugin-pwa installed and configured
- [x] Web App Manifest generated (name, icons, theme, display)
- [x] Service worker configured (minimal caching - static assets only)
- [x] PWA icons created (192x192, 512x512, apple-touch-icon, favicon)
- [ ] PWA installability verified
- [x] PWA documentation created

**Note:** PWA is first-class but minimal - installability and basic caching only. No offline-first or background sync yet.

## Phase 2 — Authentication

- [x] Supabase project created
- [x] Email/password authentication
- [x] Google OAuth integration
- [x] Role assignment (landlord/tenant)
- [x] Protected route middleware
- [x] Auth environment variables secured
- [x] Auth state management (React Context)

## Phase 3 — Landlord Features

- [x] Dashboard overview
- [x] Properties list & detail views
- [x] Rent amount & due date configuration
- [x] House rules / considerations (tenant-visible)
- [x] Maintenance insights (read-only, advisory)
- [x] Tenants list & profiles
- [x] Tenant management UI

## Phase 4 — Tenant Features

- [x] Tenant dashboard
- [x] Rent status view
- [x] Maintenance request submission
- [x] Document access
- [ ] Notifications system
- [ ] Optional feedback prompts (non-gamified)

## Phase 5 — Data Utilities

- [ ] CSV export functionality
- [ ] Audit-friendly record keeping

## Phase 6 — Polish & Refinement

- [ ] Glassmorphic styling pass (consistent across all components)
- [ ] Microinteractions (150-250ms transitions)
- [ ] Empty states designed
- [ ] Accessibility basics (ARIA labels, keyboard navigation)
- [ ] Responsive design verification (web-first, not mobile-optimized yet)

## Phase 7 — Deployment Readiness

### Pre-Production
- [ ] Production environment variables configured in hosting platform
- [ ] CI/CD passing on main branch
- [ ] Build validation successful
- [ ] PWA manifest and icons verified in production
- [ ] Environment variable documentation complete
- [ ] Deployment configuration verified (no provider-specific code)
- [ ] Pre-launch checklist completed

### Deployment
- [ ] Production deployment successful
- [ ] PWA installability verified in production
- [ ] Post-deployment smoke tests

---

## Technical Stack Summary

- **Framework:** Vite + React (TypeScript)
- **Routing:** React Router v6
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui (Radix UI primitives)
- **PWA:** vite-plugin-pwa
- **Backend:** Supabase (client-side)
- **State:** React hooks + Context
- **CI/CD:** GitHub Actions
- **Deployment:** Modern frontend hosting (Vercel, Netlify, etc.)

## Mobile & Native Strategy

**Explicitly Deferred:**
- Mobile-native UI optimizations
- React Native implementation
- Native app development

**Preserved for Future:**
- Component architecture supports RN migration
- Pure React patterns maintain portability
- No framework abstractions that block RN path

