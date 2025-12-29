# Rebrand: haume → uhome

## Metadata

- **Date**: 2025-12-29
- **Stage**: MVP
- **Status**: Completed
- **Decision Owner**: Founder

## Rationale

This rebrand reflects a strategic shift toward positioning the product as a home-centric operating layer rather than a traditional property management tool. The name "uhome" (always lowercase) was chosen to:

- Emphasize the home-first perspective for both landlords and tenants
- Create a more approachable, less corporate brand identity
- Align with the product's minimalist, user-friendly design philosophy
- Signal a shift from "property management" to "home management" as the core value proposition

The lowercase branding is intentional and consistent across all touchpoints, reinforcing the product's approachable, modern identity.

## Scope of Change

### Code
- Package name (`package.json`)
- PWA manifest name and short_name (`vite.config.ts`)
- Page title (`index.html`)
- UI component headings and navigation brand names
- Script comments

### UI
- Home page heading
- Login page heading
- Signup page heading
- Navigation brand names (landlord and tenant layouts)
- Page title in browser tab

### Documentation
- All markdown files in `/docs` directory (20+ files)
- Root-level README.md
- QUICK_START.md
- supabase/README.md
- scripts/README.md

### Configuration
- netlify.toml comment
- package.json name field
- vite.config.ts PWA manifest

### Branding
- All user-facing text now displays "uhome" (lowercase)
- Consistent lowercase branding maintained throughout

## Deprecations

**No deprecations required.** This was a clean rebrand with no backward-compatible aliases needed. All references to "haume" have been replaced with "uhome" across the codebase.

### Remaining References

None. All instances of "haume" have been replaced. The GitHub repository URL still contains "haume" in the path (e.g., `https://github.com/devluca999/haume.git`), but this is acceptable as it refers to the repository name, not the product name.

## Risks & Mitigations

### Build Issues
- **Risk**: Package name change could break dependencies
- **Mitigation**: Package name is internal-only; no external dependencies reference it. Verified build succeeds.

### Environment Mismatches
- **Risk**: Environment variables or configs referencing old name
- **Mitigation**: No environment variables contained "haume" references. All config files updated.

### App Store Metadata Conflicts
- **Risk**: N/A (PWA, not native app store deployment)
- **Mitigation**: N/A

### PWA Manifest
- **Risk**: Cached manifest with old name
- **Mitigation**: Users will receive updated manifest on next app load. Service worker will update automatically.

### Database References
- **Risk**: Database comments or seed data referencing old name
- **Mitigation**: Database schema comment updated. Seed script comments updated.

## Post-Rebrand Checklist

- [x] All haume references removed from codebase
- [x] App name displays as "uhome" throughout UI
- [x] Package name updated to "uhome"
- [x] PWA manifest updated with "uhome"
- [x] All documentation files updated
- [x] Configuration files updated
- [x] Build succeeds without errors
- [x] No broken imports or references
- [x] Rebrand document created and complete

## Files Modified

### Code Files (9)
- `package.json`
- `vite.config.ts`
- `index.html`
- `src/pages/home.tsx`
- `src/components/layout/landlord-layout.tsx`
- `src/components/layout/tenant-layout.tsx`
- `src/pages/auth/login.tsx`
- `src/pages/auth/signup.tsx`
- `scripts/seed-mock-data.ts`

### Configuration (1)
- `netlify.toml`

### Database (1)
- `supabase/schema.sql`

### Documentation (20+)
- `README.md`
- `QUICK_START.md`
- `supabase/README.md`
- `scripts/README.md`
- All files in `docs/` directory

## Summary

The rebrand from "haume" to "uhome" has been completed successfully across all code, UI, configuration, and documentation. The product now consistently uses lowercase "uhome" branding throughout. No backward compatibility concerns exist as this is an MVP-stage product. All 48+ instances of "haume" have been replaced with "uhome".

The rebrand maintains the product's minimalist, home-centric positioning while ensuring consistency across all touchpoints.

